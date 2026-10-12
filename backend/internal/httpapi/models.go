package httpapi

import "time"

var sections = map[string]bool{"vocabulary": true, "grammar": true, "reading": true, "history": true, "law": true}

type Option struct {
	RU string `json:"ru"`
	EN string `json:"en,omitempty"`
}

// Task is used for both public and admin views. Answer-revealing fields are
// pointers/omitempty and are cleared for public views until allowed.
type Task struct {
	ID            int64    `json:"id"`
	ExamID        int64    `json:"examId"`
	Position      int      `json:"position"`
	Section       string   `json:"section"`
	PromptRu      string   `json:"promptRu"`
	PromptEn      string   `json:"promptEn,omitempty"`
	PassageRu     string   `json:"passageRu,omitempty"`
	PassageEn     string   `json:"passageEn,omitempty"`
	Options       []Option `json:"options"`
	CorrectIndex  *int     `json:"correctIndex,omitempty"`
	ExplanationRu string   `json:"explanationRu,omitempty"`
	ExplanationEn string   `json:"explanationEn,omitempty"`
}

func (t Task) hidden() Task {
	t.CorrectIndex = nil
	t.ExplanationRu, t.ExplanationEn = "", ""
	return t
}

type TaskInput struct {
	Section       string   `json:"section"`
	Position      *int     `json:"position"`
	PromptRu      string   `json:"promptRu"`
	PromptEn      string   `json:"promptEn"`
	PassageRu     string   `json:"passageRu"`
	PassageEn     string   `json:"passageEn"`
	Options       []Option `json:"options"`
	CorrectIndex  int      `json:"correctIndex"`
	ExplanationRu string   `json:"explanationRu"`
	ExplanationEn string   `json:"explanationEn"`
}

type ExamInput struct {
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
	ExplanationRu string `json:"explanationRu,omitempty"`
	ExplanationEn string `json:"explanationEn,omitempty"`
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
