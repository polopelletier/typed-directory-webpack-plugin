module.exports = {
    "env": {
        "es6": true,
        "node": true,
        "mocha": true
    },
    "globals": {
        "assert": true,
        "requireSrc": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": "warn"
    }
};