package services

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
    "path/filepath"
    "time"
    "github.com/tarikpinarli/dualSculp-backend/config"
)

func CheckTripoCredits(cfg *config.Config) (int, error) {
    req, _ := http.NewRequest("GET", "https://api.tripo3d.ai/v2/openapi/user/balance", nil)
    req.Header.Set("Authorization", "Bearer "+cfg.TripoAPIKey)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil { return 0, err }
    defer resp.Body.Close()

    var result struct {
        Code int `json:"code"`
        Data struct { Balance string `json:"balance"` } `json:"data"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil { return 0, err }

    var balance int
    fmt.Sscanf(result.Data.Balance, "%d", &balance)
    return balance, nil
}

func UploadToImgBB(cfg *config.Config, filePath string) (string, error) {
    file, err := os.Open(filePath)
    if err != nil { return "", err }
    defer file.Close()

    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    part, _ := writer.CreateFormFile("image", filepath.Base(filePath))
    io.Copy(part, file)
    writer.WriteField("key", cfg.ImgBBAPIKey)
    writer.Close()

    resp, err := http.Post("https://api.imgbb.com/1/upload", writer.FormDataContentType(), body)
    if err != nil { return "", err }
    defer resp.Body.Close()

    var result struct {
        Success bool `json:"success"`
        Data struct { URL string `json:"url"` } `json:"data"`
    }
    json.NewDecoder(resp.Body).Decode(&result)

    if result.Success { return result.Data.URL, nil }
    return "", fmt.Errorf("upload failed")
}

func GenerateMeshTripo(cfg *config.Config, imageURL, outputPath string) string {
    client := &http.Client{}
    headers := map[string]string{
        "Authorization": "Bearer " + cfg.TripoAPIKey,
        "Content-Type":  "application/json",
    }

    payload := map[string]interface{}{
        "type": "image_to_model",
        "file": map[string]string{"type": "jpg", "url": imageURL},
    }
    jsonPayload, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST", "https://api.tripo3d.ai/v2/openapi/task", bytes.NewBuffer(jsonPayload))
    for k, v := range headers { req.Header.Set(k, v) }

    resp, err := client.Do(req)
    if err != nil { return "CRASH" }
    defer resp.Body.Close()

    var taskRes struct {
        Code int `json:"code"`
        Data struct { TaskID string `json:"task_id"` } `json:"data"`
    }
    json.NewDecoder(resp.Body).Decode(&taskRes)

    if taskRes.Code != 0 { return fmt.Sprintf("ERR_%d", taskRes.Code) }
    taskID := taskRes.Data.TaskID

    for i := 0; i < 120; i++ {
        time.Sleep(4 * time.Second)
        req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.tripo3d.ai/v2/openapi/task/%s", taskID), nil)
        for k, v := range headers { req.Header.Set(k, v) }
        statusResp, err := client.Do(req)
        if err != nil { continue }

        var statusRes struct {
            Code int `json:"code"`
            Data struct {
                Status string `json:"status"`
                Output struct { Model string `json:"model"`; PBR string `json:"pbr_model"` } `json:"output"`
            } `json:"data"`
        }
        json.NewDecoder(statusResp.Body).Decode(&statusRes)
        statusResp.Body.Close()

        if statusRes.Data.Status == "success" {
            modelURL := statusRes.Data.Output.Model
            if modelURL == "" { modelURL = statusRes.Data.Output.PBR }
            resp, _ := http.Get(modelURL)
            defer resp.Body.Close()
            out, _ := os.Create(outputPath)
            defer out.Close()
            io.Copy(out, resp.Body)
            return "SUCCESS"
        }
        if statusRes.Data.Status == "failed" { return "FAILED" }
    }
    return "TIMEOUT"
}