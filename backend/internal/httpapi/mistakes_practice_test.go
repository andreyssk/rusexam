package httpapi

import (
	"math/rand/v2"
	"testing"
)

func TestPickWeightedIsDistinctAndBounded(t *testing.T) {
	rng := rand.New(rand.NewPCG(1, 2))
	var pool []weightedTask
	for i := int64(1); i <= 25; i++ {
		pool = append(pool, weightedTask{id: i, weight: int(i%5) + 1})
	}
	for range 200 {
		got := pickWeighted(pool, practiceSize, rng.Float64)
		if len(got) != practiceSize {
			t.Fatalf("picked %d tasks, want %d", len(got), practiceSize)
		}
		seen := map[int64]bool{}
		for _, id := range got {
			if seen[id] {
				t.Fatalf("task %d picked twice in %v", id, got)
			}
			seen[id] = true
		}
	}
	if got := pickWeighted(pool[:3], practiceSize, rng.Float64); len(got) != 3 {
		t.Fatalf("with 3 candidates picked %d", len(got))
	}
}

// A task with more mistakes must be picked more often.
func TestPickWeightedFavoursHeavierTasks(t *testing.T) {
	rng := rand.New(rand.NewPCG(7, 8))
	pool := []weightedTask{{id: 1, weight: 1}, {id: 2, weight: 9}}
	heavy := 0
	const runs = 4000
	for range runs {
		if pickWeighted(pool, 1, rng.Float64)[0] == 2 {
			heavy++
		}
	}
	// Expected 90%; allow a generous margin.
	if share := float64(heavy) / runs; share < 0.86 || share > 0.94 {
		t.Fatalf("heavy task picked %.0f%% of the time, want about 90%%", share*100)
	}
}
