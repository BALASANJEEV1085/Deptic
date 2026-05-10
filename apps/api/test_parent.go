//go:build ignore

package main

import (
	"context"
	"fmt"
	"net/http"
	"io"
	"github.com/sbom-io/api/internal/scanner"
)

func main() {
	ctx := context.Background()
	url := "https://raw.githubusercontent.com/spring-projects/spring-petclinic/main/pom.xml"
	resp, _ := http.Get(url)
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	
	_, _, _, parent, _, _, _ := scanner.ParsePOMXML(data, true)
	fmt.Printf("Parent: %+v\n", parent)
	
	depMgmt, props, err := scanner.FetchAndParseParentPOM(ctx, nil, parent)
	fmt.Printf("Error: %v\n", err)
	fmt.Printf("DepMgmt size: %d\n", len(depMgmt))
	fmt.Printf("Props size: %d\n", len(props))
	fmt.Printf("Webmvc version in parent: %s\n", depMgmt["org.springframework.boot:spring-boot-starter-webmvc"])
}
