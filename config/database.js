module.exports = 
  { "development":
    { "driver":   "redis-hq"
    , "prefix":   "dev"
    , "database": 0
    }
  , "test":
    { "driver":   "redis-hq"
    , "prefix":   "test"
    , "database": 1
    }
  , "production":
    { "driver":   "redis-hq"
    , "prefix":   "prod"
    , "database": 2
    }
  };
