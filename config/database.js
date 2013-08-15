module.exports = 
  { "development":
    { "driver":   "redis-hq"
    , "prefix":   "dev"
    , "database": 0
    , "fulltext": {driver: 'reds', database: 5}
    , "session": {database: 10}
    }
  , "test":
    { "driver":   "redis-hq"
    , "prefix":   "test"
    , "database": 1
    , "fulltext": {driver: 'reds', database: 5}
    , "session": {database: 10}
    }
  , "production":
    { "driver":   "redis-hq"
    , "prefix":   "prod"
    , "database": 2
    , "fulltext": {database: 5}
    , "session": {database: 10}
    }
  };
