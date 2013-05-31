module.exports = 
  { "development":
    { "driver":   "redis-hq"
    , "prefix":   "dev"
    , "database": 1
    }
  , "test":
    { "driver":   "redis-hq"
    , "prefix":   "test"
    , "database": 2
    }
  , "production":
    { "driver":   "redis-hq"
    , "prefix":   "prod"
    }
  };
