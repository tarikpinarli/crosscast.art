package sockets

import (
    "encoding/base64"
    "os"
    "path/filepath"
    "strings"
    "time"

    "github.com/zishang520/socket.io/v2/socket"
    "github.com/tarikpinarli/dualSculp-backend/config"
    "github.com/tarikpinarli/dualSculp-backend/internal/services"
)

func SetupSocket(io *socket.Server, cfg *config.Config) {
    // ⚠️ TEST MODE: Set to false for production
    TEST_MODE := true 

    io.On("connection", func(clients ...any) {
        client := clients[0].(*socket.Socket)

        client.On("join_session", func(datas ...any) {
            data := datas[0].(map[string]interface{})
            room := data["sessionId"].(string)
            client.Join(socket.Room(room))
            if data["type"] == "sensor" {
                io.To(socket.Room(room)).Emit("session_status", map[string]string{"status": "connected"})
            }
        })

        client.On("send_frame", func(datas ...any) {
            data := datas[0].(map[string]interface{})
            room := data["roomId"].(string)
            imgData := data["image"].(string)

            path := filepath.Join(cfg.UploadFolder, room)
            os.MkdirAll(path, 0755)

            parts := strings.Split(imgData, ",")
            if len(parts) > 1 {
                dec, _ := base64.StdEncoding.DecodeString(parts[1])
                os.WriteFile(filepath.Join(path, "capture.jpg"), dec, 0644)
                io.To(socket.Room(room)).Emit("frame_received", map[string]any{"count": 1})
            }
        })

        client.On("process_3d", func(datas ...any) {
            data := datas[0].(map[string]interface{})
            room := data["sessionId"].(string)

            go func() {
                if TEST_MODE {
                    io.To(socket.Room(room)).Emit("processing_status", map[string]string{"step": "Processing (TEST MODE)..."})
                    time.Sleep(2 * time.Second)
                    io.To(socket.Room(room)).Emit("model_ready", map[string]string{"url": "https://raw.githack.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb"})
                    return
                }

                io.To(socket.Room(room)).Emit("processing_status", map[string]string{"step": "Uploading..."})
                url, _ := services.UploadToImgBB(cfg, filepath.Join(cfg.UploadFolder, room, "capture.jpg"))

                io.To(socket.Room(room)).Emit("processing_status", map[string]string{"step": "Generating Mesh..."})
                res := services.GenerateMeshTripo(cfg, url, filepath.Join(cfg.UploadFolder, room, "reconstruction.glb"))

                if res == "SUCCESS" {
                    io.To(socket.Room(room)).Emit("model_ready", map[string]string{"url": "reconstruction.glb"})
                } else {
                    io.To(socket.Room(room)).Emit("processing_status", map[string]string{"step": "Failed"})
                }
            }()
        })
    })
}