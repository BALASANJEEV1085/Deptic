package compliance

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/deptic-io/api/internal/scanner"
)

type DEPTICMeta struct {
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

func CheckNTIA(components []scanner.Package, depticMeta DEPTICMeta) NTIAResult {
	var result NTIAResult
	result.FailedComponents = []FailedComponent{}
	result.Recommendations = []string{}

	total := len(components)
	if total == 0 {
		return result
	}

	var supplierPassCount, namePassCount, versionPassCount, purlPassCount int
	var relationshipCount int

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
		// Element 1: Supplier Name
		// npm/pip: not collected. maven: groupID (Name contains ":")
		hasSupplier := false
		if p.Ecosystem == "maven" && strings.Contains(p.Name, ":") {
			hasSupplier = true
		}
		if hasSupplier {
			supplierPassCount++
		}

		// Element 2: Component Name
		if p.Name != "" {
			namePassCount++
		} else {
			fc := getFailedComp(p)
			fc.Missing = append(fc.Missing, "Name")
		}

		// Element 3: Version
		if p.Version != "" && p.Version != "unknown" && p.Version != "latest" {
			versionPassCount++
		} else {
			fc := getFailedComp(p)
			fc.Missing = append(fc.Missing, "Version")
		}

		// Element 4: Unique Identifiers (PURL)
		if p.Name != "" && p.Version != "" && p.Ecosystem != "" {
			purlPassCount++
		} else {
			fc := getFailedComp(p)
			if p.Ecosystem == "" {
				fc.Missing = append(fc.Missing, "Ecosystem")
			}
		}

		// Element 5 helper: Dependency Relationships
		if p.Depth > 0 && p.ParentName != "" {
			relationshipCount++
		}
	}

	for _, fc := range failedComponentsMap {
		if len(fc.Missing) > 0 {
			result.FailedComponents = append(result.FailedComponents, *fc)
		}
	}

	// Element 1: Supplier Name
	supplierCov := (supplierPassCount * 100) / total
	e1 := NTIAElement{
		Name:        "Supplier Name",
		Description: "Identify the manufacturer or supplier of each component",
		Passed:      supplierCov == 100,
		Coverage:    supplierCov,
		Detail:      fmt.Sprintf("%d out of %d components have a supplier identified", supplierPassCount, total),
	}
	result.Elements = append(result.Elements, e1)
	if !e1.Passed {
		result.Recommendations = append(result.Recommendations, "Supplier name not collected during scan. Score cannot reach 100/100 without supplier data.")
	}

	// Element 2: Component Name
	nameCov := (namePassCount * 100) / total
	e2 := NTIAElement{
		Name:        "Component Name",
		Description: "Name of the component as determined by the supplier",
		Passed:      nameCov == 100,
		Coverage:    nameCov,
		Detail:      fmt.Sprintf("%d out of %d components have a name", namePassCount, total),
	}
	result.Elements = append(result.Elements, e2)
	if !e2.Passed {
		result.Recommendations = append(result.Recommendations, "Element 2 failed: Missing component names detected.")
	}

	// Element 3: Version
	versionCov := (versionPassCount * 100) / total
	e3 := NTIAElement{
		Name:        "Version String",
		Description: "Version of the component",
		Passed:      versionCov == 100,
		Coverage:    versionCov,
		Detail:      fmt.Sprintf("%d out of %d components have a valid version string", versionPassCount, total),
	}
	result.Elements = append(result.Elements, e3)
	if !e3.Passed {
		result.Recommendations = append(result.Recommendations, fmt.Sprintf("Element 3 failed: %d components are missing version strings.", total-versionPassCount))
	}

	// Element 4: Unique Identifiers
	purlCov := (purlPassCount * 100) / total
	e4 := NTIAElement{
		Name:        "Unique Identifiers (PURL)",
		Description: "Other unique identifiers like PURL or CPE",
		Passed:      purlCov == 100,
		Coverage:    purlCov,
		Detail:      fmt.Sprintf("%d out of %d components have enough metadata to form a valid PURL", purlPassCount, total),
	}
	result.Elements = append(result.Elements, e4)
	if !e4.Passed {
		result.Recommendations = append(result.Recommendations, "Element 4 failed: Some components lack ecosystem or version data to construct a PURL.")
	}

	// Element 5: Dependency Relationships
	depsPassed := relationshipCount > 0 && total > 1
	depsCov := 0
	if total > 1 {
		depsCov = (relationshipCount * 100) / total
	}
	e5 := NTIAElement{
		Name:        "Dependency Relationships",
		Description: "How the components relate to each other",
		Passed:      depsPassed,
		Coverage:    depsCov,
		Detail:      fmt.Sprintf("%d out of %d components have a parent relationship defined", relationshipCount, total),
	}
	result.Elements = append(result.Elements, e5)
	if !e5.Passed {
		result.Recommendations = append(result.Recommendations, "Element 5 failed: No dependency relationships found (all components at depth 0).")
	}

	// Element 6: Author of DEPTIC
	authorPassed := depticMeta.AuthorName != "" && depticMeta.AuthorTool != ""
	authorCov := 0
	if authorPassed {
		authorCov = 100
	}
	e6 := NTIAElement{
		Name:        "Author of DEPTIC Data",
		Description: "Name of the entity that creates the DEPTIC data",
		Passed:      authorPassed,
		Coverage:    authorCov,
		Detail:      fmt.Sprintf("Author: %s, Tool: %s", depticMeta.AuthorName, depticMeta.AuthorTool),
	}
	result.Elements = append(result.Elements, e6)
	if !e6.Passed {
		result.Recommendations = append(result.Recommendations, "Element 6 failed: DEPTIC author name or tool is missing in metadata.")
	}

	// Element 7: Timestamp
	now := time.Now()
	oneYearAgo := now.AddDate(-1, 0, 0)
	timestampPassed := !depticMeta.GeneratedAt.IsZero() && depticMeta.GeneratedAt.After(oneYearAgo) && depticMeta.GeneratedAt.Before(now.Add(24*time.Hour))
	timestampCov := 0
	if timestampPassed {
		timestampCov = 100
	}
	e7 := NTIAElement{
		Name:        "Timestamp",
		Description: "Record of the date and time of the DEPTIC data assembly",
		Passed:      timestampPassed,
		Coverage:    timestampCov,
		Detail:      fmt.Sprintf("Generated At: %s", depticMeta.GeneratedAt.Format(time.RFC3339)),
	}
	result.Elements = append(result.Elements, e7)
	if !e7.Passed {
		result.Recommendations = append(result.Recommendations, "Element 7 failed: DEPTIC timestamp is missing or too old (> 1 year).")
	}

	// Calculate final score
	passedCount := 0
	totalCoverage := 0
	for _, e := range result.Elements {
		if e.Passed {
			passedCount++
		}
		totalCoverage += e.Coverage
	}
	result.Score = totalCoverage / len(result.Elements)
	result.Compliant = result.Score == 100

	log.Printf("NTIA result: score=%d passed=%d/7", result.Score, passedCount)

	return result
}

func CheckEUCRA(result NTIAResult) bool {
	// EU Cyber Resilience Act requires NTIA compliance PLUS score >= 80
	// Since NTIA compliance already requires 100 score, this evaluates to true if compliant
	return result.Compliant && result.Score >= 80
}
