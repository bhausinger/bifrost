-- Track starting play count so we can measure streams gained during a campaign
alter table campaigns
  add column starting_streams int default 0;
