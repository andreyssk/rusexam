package httpapi

import "time"

// Task is used for both public and admin views. Answer-revealing fields are
// pointers/omitempty and are cleared for public views until allowed.
type Task struct {
	ID           int64    `json:"id"`
	Prompt       string   `json:"prompt"`
	Passage      string   `json:"passage,omitempty"`
	Options      []string `json:"options"`
	CorrectIndex *int     `json:"correctIndex,omitempty"`
	Explanation  string   `json:"explanation,omitempty"`
	// AudioAssetID is the audio asset played with the task (served by GET /assets/{id}/file), if any.
	AudioAssetID *int64 `json:"audioAssetId"`
	// AudioAutoplay: start the audio by itself when the task appears.
	AudioAutoplay bool `json:"audioAutoplay"`
}

type LessonRef struct {
	ID      int64  `json:"id"`
	TitleRu string `json:"titleRu"`
	TitleEn string `json:"titleEn"`
}

// AdminTask is a task as the admin sees it: with its course and the lessons it is linked to.
type AdminTask struct {
	Task
	CourseID int64       `json:"courseId"`
	UsedIn   []LessonRef `json:"usedIn"`
	// ExternalID is only ever sent to admins (this type is only used by admin endpoints).
	ExternalID *string `json:"externalId"`
}

func (t Task) hidden() Task {
	t.CorrectIndex = nil
	t.Explanation = ""
	return t
}

// Course groups lessons and tasks; learners pick one in the header.
type Course struct {
	ID           int64  `json:"id"`
	TitleRu      string `json:"titleRu"`
	TitleEn      string `json:"titleEn"`
	Flag         string `json:"flag"`
	LessonsCount int    `json:"lessonsCount"`
	TasksCount   int    `json:"tasksCount"`
}

// Category groups the lessons of one course on the home page.
type Category struct {
	ID           int64  `json:"id"`
	CourseID     int64  `json:"courseId"`
	TitleRu      string `json:"titleRu"`
	TitleEn      string `json:"titleEn"`
	LessonsCount int    `json:"lessonsCount"`
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
	Prompt       string   `json:"prompt"`
	Passage      string   `json:"passage"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correctIndex"`
	Explanation  string   `json:"explanation"`
	// AudioAssetID is optional; AudioAutoplay defaults to true when omitted.
	AudioAssetID  *int64 `json:"audioAssetId"`
	AudioAutoplay *bool  `json:"audioAutoplay"`
	// ExternalID is the task's ID in another system; optional, unique when set.
	ExternalID *string `json:"externalId"`
}

// LessonInput.CourseID is required when a lesson is created and ignored on update: a lesson never changes course.
type LessonInput struct {
	CourseID      int64  `json:"courseId"`
	CategoryID    *int64 `json:"categoryId"`
	PreserveOrder bool   `json:"preserveOrder"`
	TitleRu       string `json:"titleRu"`
	TitleEn       string `json:"titleEn"`
	DescriptionRu string `json:"descriptionRu"`
	DescriptionEn string `json:"descriptionEn"`
}

type LessonStats struct {
	AttemptsCount int      `json:"attemptsCount"`
	AvgScore      *float64 `json:"avgScore"`
}

type MyLessonStats struct {
	AttemptsCount int      `json:"attemptsCount"`
	BestScore     *float64 `json:"bestScore"`
	LastScore     *float64 `json:"lastScore"`
}

type Lesson struct {
	ID         int64  `json:"id"`
	CourseID   int64  `json:"courseId"`
	CategoryID *int64 `json:"categoryId"`
	// Status is "pending" until an admin approves the lesson; learners only see approved lessons.
	Status string `json:"status"`
	// PreserveOrder: sessions keep the task order instead of shuffling it.
	PreserveOrder bool           `json:"preserveOrder"`
	TitleRu       string         `json:"titleRu"`
	TitleEn       string         `json:"titleEn"`
	DescriptionRu string         `json:"descriptionRu"`
	DescriptionEn string         `json:"descriptionEn"`
	TasksCount    int            `json:"tasksCount"`
	Stats         LessonStats    `json:"stats"`
	MyStats       *MyLessonStats `json:"myStats,omitempty"`
}

type Attempt struct {
	ID              int64      `json:"id"`
	LessonID        int64      `json:"lessonId"`
	LessonTitleRu   string     `json:"lessonTitleRu"`
	LessonTitleEn   string     `json:"lessonTitleEn"`
	Mode            string     `json:"mode"`
	Status          string     `json:"status"`
	StartedAt       time.Time  `json:"startedAt"`
	FinishedAt      *time.Time `json:"finishedAt"`
	DurationSeconds *int       `json:"durationSeconds"`
	CorrectCount    *int       `json:"correctCount"`
	TotalCount      *int       `json:"totalCount"`
	ScorePercent    *float64   `json:"scorePercent"`
	// PreserveOrder is the lesson's setting: the session must not shuffle its tasks.
	PreserveOrder bool `json:"preserveOrder"`
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

type Result struct {
	Attempt Attempt      `json:"attempt"`
	Items   []ResultItem `json:"items"`
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
