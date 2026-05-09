package main

import (
	"context"
	"fmt"
	"time"

	"github.com/sbom-io/api/internal/scanner"
)

func main() {
	pkgBytes := []byte(`
# requirements.txt
requests==2.31.0
flask>=2.0
numpy~=1.23.0
-e .
invalid line without anything useful
`)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	res, err := scanner.ScanPip(ctx, nil, pkgBytes, "requirements.txt")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	for _, p := range res {
		fmt.Printf("%s@%s (License: %s, Homepage: %s)\n", p.Name, p.Version, p.License, p.Homepage)
	}
}
