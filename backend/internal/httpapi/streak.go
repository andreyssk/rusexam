package httpapi

import (
	"net/http"
	"time"
)

// Streak counts consecutive days on which the learner finished at least one lesson
// (a completed attempt, in either mode). It is derived from attempts, not stored.
type Streak struct {
	Current   int  `json:"current"`
	Longest   int  `json:"longest"`
	DoneToday bool `json:"doneToday"`
}

// computeStreak takes the distinct days with a finished lesson (newest first) and today's date,
// both in the learner's time zone. A streak stays alive through a day that is not over yet:
// if nothing has been finished today, it still counts up to yesterday.
func computeStreak(daysDesc []time.Time, today time.Time) Streak {
	var s Streak
	if len(daysDesc) == 0 {
		return s
	}
	day := func(t time.Time) time.Time { return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC) }
	today = day(today)
	s.DoneToday = day(daysDesc[0]).Equal(today)

	run, firstRun := 0, 0
	firstDone := false
	var prev time.Time
	for i, d := range daysDesc {
		d = day(d)
		if i > 0 && prev.AddDate(0, 0, -1).Equal(d) {
			run++
		} else {
			if i > 0 {
				firstDone = true // a gap closes the run that starts at the newest day
			}
			run = 1
		}
		prev = d
		s.Longest = max(s.Longest, run)
		if !firstDone {
			firstRun = run
		}
	}
	if newest := day(daysDesc[0]); newest.Equal(today) || newest.Equal(today.AddDate(0, 0, -1)) {
		s.Current = firstRun
	}
	return s
}

func (s *Server) myStreak(w http.ResponseWriter, r *http.Request) {
	c, _ := claims(r)
	// The client sends its IANA zone so "a day" matches the learner's own calendar; unknown zones fall back to UTC.
	tz := r.URL.Query().Get("tz")
	var known bool
	if err := s.pool.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = $1)`, tz).Scan(&known); err != nil {
		fail(w, err)
		return
	}
	if !known {
		tz = "UTC"
	}

	var today time.Time
	if err := s.pool.QueryRow(r.Context(), `SELECT (now() AT TIME ZONE $1)::date`, tz).Scan(&today); err != nil {
		fail(w, err)
		return
	}
	rows, err := s.pool.Query(r.Context(), `
		SELECT DISTINCT (finished_at AT TIME ZONE $2)::date AS d
		FROM attempts
		WHERE user_id = $1 AND status = 'completed' AND finished_at IS NOT NULL
		ORDER BY d DESC`, c.UserID, tz)
	if err != nil {
		fail(w, err)
		return
	}
	defer rows.Close()
	var days []time.Time
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			fail(w, err)
			return
		}
		days = append(days, d)
	}
	if err := rows.Err(); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, computeStreak(days, today))
}
