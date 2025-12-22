package main

import (
	"log"
	"net/http"

	"vacation_calendar/internal/database"
	"vacation_calendar/internal/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := database.InitDB("vacation_calendar.db"); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	r := gin.Default()

	r.Static("/static", "./static")
	r.LoadHTMLGlob("templates/*")

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	api := r.Group("/api")
	{
		employeeHandler := handlers.NewEmployeeHandler()
		api.GET("/employees", employeeHandler.GetAll)
		api.GET("/employees/:id", employeeHandler.GetByID)
		api.POST("/employees", employeeHandler.Create)
		api.PUT("/employees/:id", employeeHandler.Update)
		api.DELETE("/employees/:id", employeeHandler.Delete)

		vacationHandler := handlers.NewVacationHandler()
		api.GET("/vacations", vacationHandler.GetAll)
		api.GET("/vacations/:id", vacationHandler.GetByID)
		api.POST("/vacations", vacationHandler.Create)
		api.PUT("/vacations/:id", vacationHandler.Update)
		api.DELETE("/vacations/:id", vacationHandler.Delete)

		calendarHandler := handlers.NewCalendarHandler()
		api.GET("/calendar/generate", calendarHandler.Generate)
	}

	log.Println("Starting server on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
