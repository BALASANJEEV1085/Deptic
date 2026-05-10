package sbom

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/sbom-io/api/internal/scanner"
)

func sanitizeSPDXID(s string) string {
	var result strings.Builder
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '.' {
			result.WriteRune(c)
		} else {
			result.WriteRune('-')
		}
	}
	return "SPDXRef-" + result.String()
}

func GenerateSPDX(scan ScanInfo, components []scanner.Package) ([]byte, string, error) {
	var sb bytes.Buffer

	// Document Header
	sb.WriteString("SPDXVersion: SPDX-2.3\n")
	sb.WriteString("DataLicense: CC0-1.0\n")
	sb.WriteString("SPDXID: SPDXRef-DOCUMENT\n")
	sb.WriteString(fmt.Sprintf("DocumentName: %s\n", scan.RepoName))
	sb.WriteString(fmt.Sprintf("DocumentNamespace: https://sbom.io/spdx/%s\n", scan.ID))
	sb.WriteString("Creator: Tool: SBOM.io-1.0.0\n")
	sb.WriteString(fmt.Sprintf("Created: %s\n", time.Now().UTC().Format(time.RFC3339)))
	sb.WriteString("\n")

	// Packages
	for _, pkg := range components {
		sb.WriteString(fmt.Sprintf("PackageName: %s\n", pkg.Name))
		spdxID := sanitizeSPDXID(fmt.Sprintf("%s-%s", pkg.Name, pkg.Version))
		sb.WriteString(fmt.Sprintf("SPDXID: %s\n", spdxID))
		sb.WriteString(fmt.Sprintf("PackageVersion: %s\n", pkg.Version))
		sb.WriteString("PackageDownloadLocation: NOASSERTION\n")
		sb.WriteString("FilesAnalyzed: false\n")

		lic := mapLicense(pkg.License)
		if lic == "" {
			lic = "NOASSERTION"
		}
		sb.WriteString(fmt.Sprintf("PackageLicenseConcluded: %s\n", lic))
		sb.WriteString(fmt.Sprintf("PackageLicenseDeclared: %s\n", lic))
		sb.WriteString("PackageCopyrightText: NOASSERTION\n")

		purl := ""
		if pkg.Ecosystem == "npm" {
			purl = fmt.Sprintf("pkg:npm/%s@%s", pkg.Name, pkg.Version)
		} else if pkg.Ecosystem == "pip" {
			purl = fmt.Sprintf("pkg:pypi/%s@%s", pkg.Name, pkg.Version)
		} else if pkg.Ecosystem == "maven" {
			mavenParts := strings.SplitN(pkg.Name, ":", 2)
			if len(mavenParts) == 2 {
				purl = fmt.Sprintf("pkg:maven/%s/%s@%s", mavenParts[0], mavenParts[1], pkg.Version)
			} else {
				purl = fmt.Sprintf("pkg:maven/%s@%s", pkg.Name, pkg.Version)
			}
		} else {
			purl = fmt.Sprintf("pkg:generic/%s@%s", pkg.Name, pkg.Version)
		}
		sb.WriteString(fmt.Sprintf("ExternalRef: PACKAGE-MANAGER purl %s\n", purl))
		sb.WriteString("\n")
	}

	textBytes := sb.Bytes()
	hash := sha256.Sum256(textBytes)
	hashStr := hex.EncodeToString(hash[:])

	return textBytes, hashStr, nil
}
