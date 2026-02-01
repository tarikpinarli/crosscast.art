package main

import (
	"log"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/zishang520/socket.io/v2/socket"

	"github.com/tarikpinarli/dualSculp-backend/config"
	"github.com/tarikpinarli/dualSculp-backend/internal/handlers"
	"github.com/tarikpinarli/dualSculp-backend/internal/sockets"
	"github.com/tarikpinarli/dualSculp-backend/internal/database"
)

func main() {
	cfg := config.LoadConfig()

	database.Connect()
	io := socket.NewServer(nil, nil)
	sockets.SetupSocket(io)
	sockHandler := io.ServeHandler(nil)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods: []string{"GET","POST","OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
	}))

	h := handlers.NewHandler(cfg)

    api := r.Group("/")
    {
        api.GET("/ping", func(c *gin.Context) { c.String(200, "pong") })
        api.GET("/check-availability", h.CheckAvailability)
        api.POST("/create-payment-intent", h.CreatePaymentIntent)
        api.POST("/signup", h.Register)
		api.POST("/login", h.Login)
	}

	r.Any("/socket.io/*any", gin.WrapH(sockHandler))

	log.Printf("🚀 Starting on %s", cfg.Port)
	r.Run("0.0.0.0:" + cfg.Port)
}