#!/bin/bash

# Load environment variables
[ -f ../../.env ] && source ../../.env

# Check if CLICKHOUSE_URL is configured
if [ -z "${CLICKHOUSE_URL}" ]; then
  echo "Info: CLICKHOUSE_URL not configured, skipping migration."
  exit 0
fi

# Check if Node.js is available
if ! command -v node &> /dev/null
then
    echo "Error: Node.js is not installed or not in PATH."
    echo "Please install Node.js to run this script."
    exit 1
fi

# Ensure CLICKHOUSE_DB is set
if [ -z "${CLICKHOUSE_DB}" ]; then
    export CLICKHOUSE_DB="default"
fi

# Ensure CLICKHOUSE_CLUSTER_NAME is set
if [ -z "${CLICKHOUSE_CLUSTER_NAME}" ]; then
    export CLICKHOUSE_CLUSTER_NAME="default"
fi

# Function to find and use the correct dotenv command
find_dotenv() {
    # First try to use dotenv from node_modules
    if [ -f "../../node_modules/.bin/dotenv" ]; then
        echo "../../node_modules/.bin/dotenv"
        return 0
    fi
    
    # Then try to use global dotenv
    if command -v dotenv &> /dev/null; then
        echo "dotenv"
        return 0
    fi
    
    # If neither exists, try to install dotenv-cli globally
    echo "dotenv not found, attempting to install dotenv-cli globally..." >&2
    if npm install -g dotenv-cli; then
        echo "dotenv-cli installed successfully" >&2
        echo "dotenv"
        return 0
    else
        echo "Failed to install dotenv-cli" >&2
        return 1
    fi
}

# Get the dotenv command
DOTENV_CMD=$(find_dotenv)
if [ $? -ne 0 ]; then
    echo "Error: Could not find or install dotenv command"
    exit 1
fi

echo "Using dotenv command: $DOTENV_CMD"

# Execute the down command using Node.js migration script
if [ "$CLICKHOUSE_CLUSTER_ENABLED" == "false" ] ; then
  $DOTENV_CMD -e ../../.env -- node clickhouse/scripts/migrate.js down unclustered
else
  $DOTENV_CMD -e ../../.env -- node clickhouse/scripts/migrate.js down clustered
fi