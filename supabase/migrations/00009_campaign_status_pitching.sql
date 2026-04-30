-- Rename campaign status 'placing' → 'pitching'
update campaigns set status = 'pitching' where status = 'placing';
