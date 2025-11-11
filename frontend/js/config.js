// Application configuration constants
const Config = {
    // Server configuration
    DEFAULT_PORT: '5555',
    
    // Game configuration
    DEFAULT_TIME_LIMIT: 300, // 5 minutes in seconds
    DEFAULT_MODULE_COUNT: 6,
    MIN_MODULE_COUNT: 1,
    MAX_MODULE_COUNT: 6,
    
    // WebSocket configuration
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY_BASE: 1000, // Base delay in milliseconds
    
    // Game constants
    MAX_STRIKES: 3,
    
    // UI constants
    TIMER_WARNING_THRESHOLD: 60, // seconds - show warning when less than this
    TIMER_CRITICAL_THRESHOLD: 120, // seconds - show critical warning when less than this
};

