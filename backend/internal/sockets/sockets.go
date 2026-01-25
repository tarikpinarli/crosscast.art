package sockets

import (
	"log"
	"github.com/zishang520/socket.io/v2/socket"
)

func SetupSocket(io *socket.Server) {
	// When a new user connects, the Socket.IO library calls this function 
	// and passes us the new user's socket inside the 'clients' list.
	io.On("connection", func(clients ...any) {
		log.Println("✅ A user connected!")
	})
}