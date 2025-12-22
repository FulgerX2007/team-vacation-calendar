package models

import (
	"time"
)

type Vacation struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	EmployeeID  uint      `json:"employee_id" gorm:"not null"`
	StartDate   time.Time `json:"start_date" gorm:"not null"`
	EndDate     time.Time `json:"end_date" gorm:"not null"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Employee    Employee  `json:"employee,omitempty" gorm:"foreignKey:EmployeeID"`
}
