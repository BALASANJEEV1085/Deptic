package compliance

import (
	"fmt"
	"time"

	"github.com/sbom-io/api/internal/scanner"
)

type SBOMMeta struct {
	AuthorName  string
	AuthorTool  string
	GeneratedAt time.Time
	RepoName    string
}

type NTIAResult struct {
	Compliant        bool              `json:"compliant"`
	Score            int               `json:"score"` // 0-100
	Elements         []NTIAElement     `json:"elements"`
	FailedComponents []FailedComponent `json:"failed_components,omitempty"`
	Recommendations  []string          `json:"recommendations"`
}

type NTIAElement struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Passed      bool   `json:"passed"`
	Coverage    int    `json:"coverage"` // percentage 0-100
	Detail      string `json:"detail"`
}

type FailedComponent struct {
	Name    string   `json:"name"`
	Version string   `json:"version"`
	Missing []string `json:"missing"` // which fields are missing
}

func CheckNTIA(components []scanner.Package, sbomMeta SBOMMeta) NTIAResult {
	var result NTIAResult
	result.FailedComponents = []FailedComponent{}
	result.Recommendations = []string{}

	total := len(components)
	if total == 0 {
		return result
	}

	var supplierCount, nameCount, versionCount, purlCount int
	var hasTransitive bool

	failedComponentsMap := make(map[string]*FailedComponent)

	getFailedComp := func(p scanner.Package) *FailedComponent {
		key := fmt.Sprintf("%s@%s", p.Name, p.Version)
		if fc, exists := failedComponentsMap[key]; exists {
			return fc
		}
		fc := &FailedComponent{Name: p.Name, Version: p.Version, Missing: []string{}}
		failedComponentsMap[key] = fc
		return fc
	}

	for _, p := range components {
		// Element 1 & 2: Supplier Name and Component Name
		if p.Name != "" {
			supplierCount++
			nameCount++
		} else {
			fc := getFailedComp(p)
			fc.Missing = append(fc.Missing, "Name")
		}

		// Element 3: Version
		if p.Version != "" && p.Version != "unknown" {
			versionCount++
		} else {
			fc := getFailedComp(p)
			fc.Missing = append(fc.Missing, "Version")
		}

		// Element 4: PURL (Name, Version, Ecosystem)
		if p.Name != "" && p.Version != "" && p.Version != "unknown" && p.Ecosystem != "" {
			purlCount++
		} else {
			fc := getFailedComp(p)
			if p.Ecosystem == "" {
				fc.Missing = append(fc.Missing, "Ecosystem")
			}
		}

		// Element 5 helper: Depth check
		if p.Depth > 0 {
			hasTransitive = true
		}
	}

	for _, fc := range failedComponentsMap {
		if len(fc.Missing) > 0 {
			result.FailedComponents = append(result.FailedComponents, *fc)
		}
	}

	// Element 1: Supplier Name
	supplierCov := (supplierCount * 100) / total
	e1 := NTIAElement{
		Name:        "Supplier Name",
		Description: "Identify the manufacturer or supplier of each component",
		Passed:      supplierCov == 100,
		Coverage:    supplierCov,
		Detail:      fmt.Sprintf("%d out of %d components have a supplier/name identified", supplierCount, total),
	}
	result.Elements = append(result.Elements, e1)
	if !e1.Passed {
		result.Recommendations = append(result.Recommendations, "Element 1 failed: Ensure all components have an identifiable supplier/name.")
	}

	// Element 2: Component Name
	nameCov := (nameCount * 100) / total
	e2 := NTIAElement{
		Name:        "Component Name",
		Description: "Name of the component as determined by the supplier",
		Passed:      nameCov == 100,
		Coverage:    nameCov,
		Detail:      fmt.Sprintf("%d out of %d components have a name", nameCount, total),
	}
	result.Elements = append(result.Elements, e2)
	if !e2.Passed {
		result.Recommendations = append(result.Recommendations, "Element 2 failed: Missing component names detected.")
	}

	// Element 3: Version
	versionCov := (versionCount * 100) / total
	e3 := NTIAElement{
		Name:        "Version",
		Description: "Version of the component",
		Passed:      versionCov == 100,
		Coverage:    versionCov,
		Detail:      fmt.Sprintf("%d out of %d components have a precise version string", versionCount, total),
	}
	result.Elements = append(result.Elements, e3)
	if !e3.Passed {
		result.Recommendations = append(result.Recommendations, fmt.Sprintf("Element 3 failed: %d components are missing version strings. Consider pinning all dependencies to exact versions.", total-versionCount))
	}

	// Element 4: Unique Identifiers
	purlCov := (purlCount * 100) / total
	e4 := NTIAElement{
		Name:        "Unique Identifiers",
		Description: "Other unique identifiers like PURL or CPE",
		Passed:      purlCov == 100,
		Coverage:    purlCov,
		Detail:      fmt.Sprintf("%d out of %d components have enough metadata to form a valid PURL", purlCount, total),
	}
	result.Elements = append(result.Elements, e4)
	if !e4.Passed {
		result.Recommendations = append(result.Recommendations, "Element 4 failed: Some components lack ecosystem or version data to construct a PURL.")
	}

	// Element 5: Dependency Relationships
	depsPassed := hasTransitive || (total > 1)
	depsCov := 0
	if depsPassed {
		depsCov = 100
	}
	e5 := NTIAElement{
		Name:        "Dependency Relationships",
		Description: "How the components relate to each other",
		Passed:      depsPassed,
		Coverage:    depsCov,
		Detail:      "Dependency tree contains relationships (transitive dependencies or multiple direct)",
	}
	result.Elements = append(result.Elements, e5)
	if !e5.Passed {
		result.Recommendations = append(result.Recommendations, "Element 5 failed: No distinct dependency relationships found.")
	}

	// Element 6: Author of SBOM
	authorPassed := sbomMeta.AuthorName != "" && sbomMeta.AuthorTool != ""
	authorCov := 0
	if authorPassed {
		authorCov = 100
	}
	e6 := NTIAElement{
		Name:        "Author of SBOM",
		Description: "Name of the entity that creates the SBOM data",
		Passed:      authorPassed,
		Coverage:    authorCov,
		Detail:      fmt.Sprintf("Author: %s, Tool: %s", sbomMeta.AuthorName, sbomMeta.AuthorTool),
	}
	result.Elements = append(result.Elements, e6)
	if !e6.Passed {
		result.Recommendations = append(result.Recommendations, "Element 6 failed: SBOM author name or tool is missing in metadata.")
	}

	// Element 7: Timestamp
	oneYearAgo := time.Now().AddDate(-1, 0, 0)
	timestampPassed := !sbomMeta.GeneratedAt.IsZero() && sbomMeta.GeneratedAt.After(oneYearAgo)
	timestampCov := 0
	if timestampPassed {
		timestampCov = 100
	}
	e7 := NTIAElement{
		Name:        "Timestamp",
		Description: "Record of the date and time of the SBOM data assembly",
		Passed:      timestampPassed,
		Coverage:    timestampCov,
		Detail:      fmt.Sprintf("Generated At: %s", sbomMeta.GeneratedAt.Format(time.RFC3339)),
	}
	result.Elements = append(result.Elements, e7)
	if !e7.Passed {
		result.Recommendations = append(result.Recommendations, "Element 7 failed: SBOM timestamp is missing or too old (> 1 year).")
	}

	// Calculate final score
	passedCount := 0
	for _, e := range result.Elements {
		if e.Passed {
			passedCount++
		}
	}
	result.Score = (passedCount * 100) / 7
	result.Compliant = result.Score == 100

	return result
}

func CheckEUCRA(result NTIAResult) bool {
	// EU Cyber Resilience Act requires NTIA compliance PLUS score >= 80
	// Since NTIA compliance already requires 100 score, this evaluates to true if compliant
	return result.Compliant && result.Score >= 80
}
