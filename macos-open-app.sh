#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Elastico macOS Opening Assistant    ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Find the app in common locations
LOCATIONS=(
  "./src-tauri/target/release/bundle/macos/Elastico.app"
  "./Elastico.app"
  "$HOME/Downloads/Elastico.app"
)

APP_PATH=""

for loc in "${LOCATIONS[@]}"; do
  if [ -d "$loc" ]; then
    APP_PATH="$loc"
    break
  fi
done

# If app not found, ask for location
if [ -z "$APP_PATH" ]; then
  echo -e "${YELLOW}Elastico.app wasn't found in common locations.${NC}"
  read -p "Please enter the full path to Elastico.app: " APP_PATH
  
  if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}Error: The specified path doesn't exist or is not a directory.${NC}"
    exit 1
  fi
fi

echo -e "${YELLOW}Found Elastico at: ${NC}$APP_PATH"
echo ""

# Confirm before proceeding
read -p "Do you want to remove the quarantine attribute and open the app? (y/n): " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
  echo -e "${YELLOW}Operation cancelled by user.${NC}"
  exit 0
fi

# Remove quarantine attribute
echo -e "${YELLOW}Removing quarantine attribute...${NC}"
xattr -cr "$APP_PATH"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Quarantine attribute successfully removed!${NC}"
else
  echo -e "${RED}Failed to remove quarantine attribute. Try running this script with sudo.${NC}"
  exit 1
fi

# Open the app
echo -e "${YELLOW}Opening Elastico...${NC}"
open "$APP_PATH"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Elastico should be opening now!${NC}"
  echo ""
  echo -e "${YELLOW}Note: If macOS still blocks the app, go to System Preferences → Security & Privacy → General,${NC}"
  echo -e "${YELLOW}      then click 'Open Anyway' for Elastico.${NC}"
else
  echo -e "${RED}Failed to open Elastico.${NC}"
  echo -e "${YELLOW}Please try opening it manually by right-clicking and selecting 'Open'.${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Thank you for using Elastico!        ${NC}"
echo -e "${GREEN}=========================================${NC}" 