package storage

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func NewE2Client() (*s3.Client, error) {
	endpoint := os.Getenv("STORAGE_ENDPOINT")
	region := os.Getenv("STORAGE_REGION")
	accessKey := os.Getenv("STORAGE_ACCESS_KEY_ID")
	secretKey := os.Getenv("STORAGE_SECRET_ACCESS_KEY")

	if endpoint == "" || region == "" || accessKey == "" || secretKey == "" {
		return nil, fmt.Errorf("missing one or more required storage environment variables")
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, rgn string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:           endpoint,
			SigningRegion: region,
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion(region),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load e2 configuration: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return client, nil
}

func UploadFile(
	ctx context.Context,
	client *s3.Client,
	key string,
	data []byte,
	contentType string,
) error {
	bucket := os.Getenv("STORAGE_BUCKET_NAME")
	if bucket == "" {
		return fmt.Errorf("STORAGE_BUCKET_NAME is not set")
	}

	fmt.Printf("Uploading file to E2: %s\n", key)

	_, err := client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return fmt.Errorf("failed to upload file %s: %w", key, err)
	}

	fmt.Printf("Successfully uploaded file: %s\n", key)
	return nil
}

func GetPresignedURL(
	ctx context.Context,
	client *s3.Client,
	key string,
	expiry time.Duration,
) (string, error) {
	bucket := os.Getenv("STORAGE_BUCKET_NAME")
	if bucket == "" {
		return "", fmt.Errorf("STORAGE_BUCKET_NAME is not set")
	}

	fmt.Printf("Generating presigned URL for: %s\n", key)

	// Extract filename from key to set attachment disposition
	parts := strings.Split(key, "/")
	filename := parts[len(parts)-1]

	presignClient := s3.NewPresignClient(client)
	req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket:                     aws.String(bucket),
		Key:                        aws.String(key),
		ResponseContentDisposition: aws.String(fmt.Sprintf("attachment; filename=\"%s\"", filename)),
	}, s3.WithPresignExpires(expiry))

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned url for %s: %w", key, err)
	}

	return req.URL, nil
}

func DeleteFile(
	ctx context.Context,
	client *s3.Client,
	key string,
) error {
	bucket := os.Getenv("STORAGE_BUCKET_NAME")
	if bucket == "" {
		return fmt.Errorf("STORAGE_BUCKET_NAME is not set")
	}

	fmt.Printf("Deleting file from E2: %s\n", key)

	_, err := client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})

	if err != nil {
		return fmt.Errorf("failed to delete file %s: %w", key, err)
	}

	fmt.Printf("Successfully deleted file: %s\n", key)
	return nil
}

func BuildSBOMKey(scanID, filename string) string {
	return fmt.Sprintf("sboms/%s/%s", scanID, filename)
}
