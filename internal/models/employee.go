package models

import (
	"time"
)

type Employee struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	Color     string    `json:"color" gorm:"default:'#3498db'"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Vacations []Vacation `json:"vacations,omitempty" gorm:"foreignKey:EmployeeID"`
}
