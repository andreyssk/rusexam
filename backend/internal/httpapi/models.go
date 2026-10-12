package httpapi

import "time"

var sections = map[string]bool{"vocabulary": true, "grammar": true, "reading": true, "history": true, "law": true}

// Task is used for both public and admin views. Answer-revealing fields are
// pointers/omitempty and are cleared for public views until allowed.
type Task struct {
	ID           int64    `json:"id"`
	Section      string   `json:"section"`
	Prompt       string   `json:"prompt"`
	Passage      string   `json:"passage,omitempty"`
	Options      []string `json:"options"`
	CorrectIndex *int     `json:"correctIndex,omitempty"`
	Explanation  string   `json:"explanation,omitempty"`
}

type ExamRef struct {
	ID      int64  `json:"id"`
	TitleRu string `json:"titleRu"`
	TitleEn string `json:"titleEn"`
}

// AdminTask is a task as the admin sees it: with its course and the exams it is linked to.
type AdminTask struct {
	Task
	CourseID int64     `json:"courseId"`
	UsedIn   []ExamRef `json:"usedIn"`
}

func (t Task) hidden() Task {
	t.CorrectIndex = nil
	t.Explanation = ""
	return t
}

// Course groups exams and tasks; learners pick one in the header.
type Course struct {
	ID         int64  `json:"id"`
	TitleRu    string `json:"titleRu"`
	TitleEn    string `json:"titleEn"`
	Flag       string `json:"flag"`
	ExamsCount int    `json:"examsCount"`
	TasksCount int    `json:"tasksCount"`
}

// Category groups the exams of one course on the home page.
type Category struct {
	ID         int64  `json:"id"`
	CourseID   int64  `json:"courseId"`
	TitleRu    string `json:"titleRu"`
	TitleEn    string `json:"titleEn"`
	ExamsCount int    `json:"examsCount"`
}

// CategoryInput.CourseID is required when a category is created and ignored on update: a category never changes course.
type CategoryInput struct {
	CourseID int64  `json:"courseId"`
	TitleRu  string `json:"titleRu"`
	TitleEn  string `json:"titleEn"`
}

type CourseInput struct {
	TitleRu string `json:"titleRu"`
	TitleEn string `json:"titleEn"`
	Flag    string `json:"flag"`
}

// TaskInput.CourseID is required when a task is created and ignored on update: a task never changes course.
type TaskInput struct {
	CourseID     int64    `json:"courseId"`
	Section      string   `json:"section"`
	Prompt       string   `json:"prompt"`
	Passage      string   `json:"passage"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correctIndex"`
	Explanation  string   `json:"explanation"`
}

// ExamInput.CourseID is required when an exam is created and ignored on update: an exam never changes course.
type ExamInput struct {
	CourseID      int64  `json:"courseId"`
	CategoryID    *int64 `json:"categoryId"`
	TitleRu       string `json:"titleRu"`
	TitleEn       string `json:"titleEn"`
	DescriptionRu string `json:"descriptionRu"`
	DescriptionEn string `json:"descriptionEn"`
}

type ExamStats struct {
	AttemptsCount int      `json:"attemptsCount"`
	AvgScore      *float64 `json:"avgScore"`
}

type MyExamStats struct {
	AttemptsCount int      `json:"attemptsCount"`
	BestScore     *float64 `json:"bestScore"`
	LastScore     *float64 `json:"lastScore"`
}

type Exam struct {
	ID            int64          `json:"id"`
	CourseID      int64          `json:"courseId"`
	CategoryID    *int64         `json:"categoryId"`
	TitleRu       string         `json:"titleRu"`
	TitleEn       string         `json:"titleEn"`
	DescriptionRu string         `json:"descriptionRu"`
	DescriptionEn string         `json:"descriptionEn"`
	TasksCount    int            `json:"tasksCount"`
	Sections      map[string]int `json:"sections"`
	Stats         ExamStats      `json:"stats"`
	MyStats       *MyExamStats   `json:"myStats,omitempty"`
}

type Attempt struct {
	ID              int64      `json:"id"`
	ExamID          int64      `json:"examId"`
	ExamTitleRu     string     `json:"examTitleRu"`
	ExamTitleEn     string     `json:"examTitleEn"`
	Mode            string     `json:"mode"`
	Status          string     `json:"status"`
	StartedAt       time.Time  `json:"startedAt"`
	FinishedAt      *time.Time `json:"finishedAt"`
	DurationSeconds *int       `json:"durationSeconds"`
	CorrectCount    *int       `json:"correctCount"`
	TotalCount      *int       `json:"totalCount"`
	ScorePercent    *float64   `json:"scorePercent"`
}

type AnswerState struct {
	TaskID        int64  `json:"taskId"`
	SelectedIndex int    `json:"selectedIndex"`
	IsCorrect     *bool  `json:"isCorrect,omitempty"`
	CorrectIndex  *int   `json:"correctIndex,omitempty"`
	Explanation   string `json:"explanation,omitempty"`
}

type AttemptState struct {
	Attempt Attempt       `json:"attempt"`
	Tasks   []Task        `json:"tasks"`
	Answers []AnswerState `json:"answers"`
}

type ResultItem struct {
	Task          Task `json:"task"`
	SelectedIndex *int `json:"selectedIndex"`
	IsCorrect     bool `json:"isCorrect"`
}

type SectionScore struct {
	Section string `json:"section"`
	Correct int    `json:"correct"`
	Total   int    `json:"total"`
}

type Result struct {
	Attempt  Attempt        `json:"attempt"`
	Items    []ResultItem   `json:"items"`
	Sections []SectionScore `json:"sections"`
}

type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type AdminUser struct {
	ID                int64     `json:"id"`
	Username          string    `json:"username"`
	Role              string    `json:"role"`
	Blocked           bool      `json:"blocked"`
	CreatedAt         time.Time `json:"createdAt"`
	CompletedAttempts int       `json:"completedAttempts"`
}

type Settings struct {
	AllowSignups bool `json:"allowSignups"`
}
