package httpapi

import "net/http"

// Preferences are a user's own settings; they follow the account to any device.
type Preferences struct {
	// AudioVolume is 0 (muted) to 1; new accounts start at 0.5.
	AudioVolume float64 `json:"audioVolume"`
	// AudioSpeed is the playback rate of task audio, 1 = normal.
	AudioSpeed float64 `json:"audioSpeed"`
	// CollapsedCategories are the lesson categories folded on the home page; 0 is the group of lessons without a category.
	CollapsedCategories []int64 `json:"collapsedCategories"`
	// SoundsEnabled turns the motivational sounds of a session on or off.
	SoundsEnabled bool `json:"soundsEnabled"`
}

func (s *Server) getPreferences(w http.ResponseWriter, r *http.Request) {
	c, _ := claims(r)
	var p Preferences
	if err := s.pool.QueryRow(r.Context(),
		`SELECT audio_volume::float8, audio_speed::float8, collapsed_categories, sounds_enabled FROM users WHERE id = $1`, c.UserID).Scan(&p.AudioVolume, &p.AudioSpeed, &p.CollapsedCategories, &p.SoundsEnabled); err != nil {
		fail(w, err)
		return
	}
	if p.CollapsedCategories == nil {
		p.CollapsedCategories = []int64{}
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) updatePreferences(w http.ResponseWriter, r *http.Request) {
	var in Preferences
	if !readJSON(w, r, &in) {
		return
	}
	if in.AudioVolume < 0 || in.AudioVolume > 1 {
		writeError(w, http.StatusBadRequest, "audioVolume must be between 0 and 1")
		return
	}
	if in.AudioSpeed < 0.25 || in.AudioSpeed > 4 {
		writeError(w, http.StatusBadRequest, "audioSpeed must be between 0.25 and 4")
		return
	}
	if len(in.CollapsedCategories) > 1000 {
		writeError(w, http.StatusBadRequest, "too many collapsed categories")
		return
	}
	if in.CollapsedCategories == nil {
		in.CollapsedCategories = []int64{}
	}
	c, _ := claims(r)
	if _, err := s.pool.Exec(r.Context(),
		`UPDATE users SET audio_volume = $2, audio_speed = $3, collapsed_categories = $4, sounds_enabled = $5 WHERE id = $1`,
		c.UserID, in.AudioVolume, in.AudioSpeed, in.CollapsedCategories, in.SoundsEnabled); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, in)
}
