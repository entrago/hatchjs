module.exports = 
  { "development":
    { "driver":   "redis-hq"
    , "prefix":   "dev"
    }
  , "test":
    { "driver":   "redis-hq"
    , "prefix":   "test"
    }
  , "production":
    { "driver":   "redis-hq"
    , "prefix":   "prod"
    }
  };
