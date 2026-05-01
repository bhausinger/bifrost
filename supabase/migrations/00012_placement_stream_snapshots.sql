-- Track play count snapshots for stream attribution per placement.
-- streams_at_placement: total track plays when placement is created
-- streams_at_removal: total track plays when placement is removed
-- delta = streams driven during the placement window

alter table placements
  add column streams_at_placement int,
  add column streams_at_removal int;
