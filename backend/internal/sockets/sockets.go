package sockets

import (
	"time"
	"github.com/zishang520/socket.io/v2/socket"
	"github.com/tarikpinarli/dualSculp-backend/config"
)

func SetupSocket(io *socket.Server, cfg *config.Config) {
	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		
		// Listener for the "Generate" button click
		client.On("process_3d", func(datas ...any) {
			
			// We run this in a goroutine so it doesn't block the server
			go func() {
				// 1. Simulate "Processing" steps to make it feel real
				client.Emit("processing_status", map[string]string{"step": "Verifying Payment..."})
				time.Sleep(1 * time.Second)

				client.Emit("processing_status", map[string]string{"step": "Analyzing Geometry..."})
				time.Sleep(1 * time.Second)

				client.Emit("processing_status", map[string]string{"step": "Generating Neural Mesh..."})
				time.Sleep(2 * time.Second)

				// 2. Return the Test Model (Duck)
				// We use a raw GitHub URL that serves the file correctly
				testModelURL := "https://raw.githack.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb"
				
				client.Emit("model_ready", map[string]string{"url": testModelURL})
			}()
		})
	})
}