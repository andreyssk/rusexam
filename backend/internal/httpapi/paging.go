package httpapi

import (
	"net/http"
	"strconv"
)

const maxPageSize = 50

// pageParams reads ?limit= and ?offset=; it answers 400 itself and returns false when they are invalid.
func pageParams(w http.ResponseWriter, r *http.Request, defaultLimit int) (limit, offset int, ok bool) {
	limit = defaultLimit
	if v := r.URL.Query().Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > maxPageSize {
			writeError(w, http.StatusBadRequest, "limit must be between 1 and "+strconv.Itoa(maxPageSize))
			return 0, 0, false
		}
		limit = n
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			writeError(w, http.StatusBadRequest, "invalid offset")
			return 0, 0, false
		}
		offset = n
	}
	return limit, offset, true
}
