package httpapi

import "net/http"

// Preferences are a user's own settings; they follow the account to any device.
type Preferences struct {
	// AudioVolume is 0 (muted) to 1; new accounts start at 0.5.
	AudioVolume float64 `json:"audioVolume"`
	// AudioSpeed is the playback rate of task audio, 1 = normal.
	AudioSpeed float64 `json:"audioSpeed"`
}

func (s *Server) getPreferences(w http.ResponseWriter, r *http.Request) {
	c, _ := claims(r)
	var p Preferences
	if err := s.pool.QueryRow(r.Context(),
		`SELECT audio_volume::float8, audio_speed::float8 FROM users WHERE id = $1`, c.UserID).Scan(&p.AudioVolume, &p.AudioSpeed); err != nil {
		fail(w, err)
		return
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
	c, _ := claims(r)
	if _, err := s.pool.Exec(r.Context(),
		`UPDATE users SET audio_volume = $2, audio_speed = $3 WHERE id = $1`, c.UserID, in.AudioVolume, in.AudioSpeed); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, in)
}
