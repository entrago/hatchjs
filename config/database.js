module.exports = 
  { "development":
    { "driver":   "redis-hq"
    , "prefix":   "dev"
    , "database": 0
    , "fulltext": {database: 5}
    }
  , "test":
    { "driver":   "redis-hq"
    , "prefix":   "test"
    , "database": 1
    , "fulltext": {database: 5}
    }
  , "production":
    { "driver":   "redis-hq"
    , "prefix":   "prod"
    , "database": 2
    , "fulltext": {database: 5}
    }
  };
