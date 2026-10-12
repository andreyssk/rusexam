package httpapi

import (
	"testing"
	"time"
)

func TestComputeStreak(t *testing.T) {
	today := time.Date(2026, 10, 12, 0, 0, 0, 0, time.UTC)
	d := func(back ...int) []time.Time {
		out := make([]time.Time, len(back))
		for i, b := range back {
			out[i] = today.AddDate(0, 0, -b)
		}
		return out
	}
	tests := []struct {
		name string
		days []time.Time
		want Streak
	}{
		{"no lessons", nil, Streak{}},
		{"only today", d(0), Streak{1, 1, true}},
		{"three days up to today", d(0, 1, 2), Streak{3, 3, true}},
		{"alive through yesterday", d(1, 2, 3), Streak{3, 3, false}},
		{"broken: last lesson two days ago", d(2, 3), Streak{0, 2, false}},
		{"gap ends the current run, longest is older", d(0, 1, 4, 5, 6, 7), Streak{2, 4, true}},
		{"old long run, nothing recent", d(10, 11, 12), Streak{0, 3, false}},
	}
	for _, tc := range tests {
		if got := computeStreak(tc.days, today); got != tc.want {
			t.Errorf("%s: got %+v, want %+v", tc.name, got, tc.want)
		}
	}
}
