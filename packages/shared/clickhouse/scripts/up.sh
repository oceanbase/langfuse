#!/bin/bash

# Load environment variables
[ -f ../../.env ] && source ../../.env

# Check if CLICKHOUSE_URL is configured
if [ -z "${CLICKHOUSE_URL}" ]; then
  echo "Error: CLICKHOUSE_URL is not configured."
  echo "Please set CLICKHOUSE_URL in your environment variables."
  exit 1
fi

# Check if CLICKHOUSE_MIGRATION_URL is configured
if [ -z "${CLICKHOUSE_MIGRATION_URL}" ]; then
  echo "Error: CLICKHOUSE_MIGRATION_URL is not configured."
  echo "Please set CLICKHOUSE_MIGRATION_URL in your environment variables."
  exit 1
fi

# Check if CLICKHOUSE_USER is set
if [ -z "${CLICKHOUSE_USER}" ]; then
  echo "Error: CLICKHOUSE_USER is not set."
  echo "Please set CLICKHOUSE_USER in your environment variables."
  exit 1
fi

# Check if CLICKHOUSE_PASSWORD is set
if [ -z "${CLICKHOUSE_PASSWORD}" ]; then
  echo "Error: CLICKHOUSE_PASSWORD is not set."
  echo "Please set CLICKHOUSE_PASSWORD in your environment variables."
  exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null
then
    # Try to find Node.js in common locations
    if [ -f "/usr/local/bin/node" ]; then
        export PATH="/usr/local/bin:$PATH"
    elif [ -f "/usr/bin/node" ]; then
        export PATH="/usr/bin:$PATH"
    else
        echo "Error: Node.js is not installed or not in PATH."
        echo "Please install Node.js to run this script."
        echo "Tried paths: /usr/local/bin/node, /usr/bin/node"
        exit 1
    fi
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
    
    # Then try to use global dotenv-cli
    if command -v dotenv-cli &> /dev/null; then
        echo "dotenv-cli"
        return 0
    fi
    
    # If neither exists, try to install dotenv-cli globally
    echo "dotenv-cli not found, attempting to install dotenv-cli globally..." >&2
    if npm install -g dotenv-cli; then
        echo "dotenv-cli installed successfully" >&2
        echo "dotenv-cli"
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

# Execute the up command using Node.js migration script
if [ "${CLICKHOUSE_CLUSTER_ENABLED:-false}" == "false" ] ; then
  $DOTENV_CMD -e ../../.env -- node clickhouse/scripts/migrate.js up unclustered
else
  $DOTENV_CMD -e ../../.env -- node clickhouse/scripts/migrate.js up clustered
fi
