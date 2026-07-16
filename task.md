# Tasks

- `[x]` Define JSON storage functions and safe Win32 ctypes declarations in `backend/engine.py`
- `[x]` Implement automatic migration from SQLite to JSON in `init_db()`
- `[x]` Implement UWP AUMID retrieval and EnumChildWindows helpers in `backend/engine.py`
- `[x]` Implement bulk process command line fetching in `backend/engine.py`
- `[x]` Update `capture_windows` to apply WS_EX_TOOLWINDOW / owned window filtering and resolve UWP apps
- `[x]` Update API endpoints in `backend/engine.py` to use JSON storage
- `[x]` Update File Explorer restoration block to use polling and existing HWND exclusion
- `[x]` Update VS Code restoration block to use absolute `exe_path` and polling with existing HWND exclusion
- `[x]` Update Other Windows restoration block to use polling and existing HWND exclusion
- `[x]` Add browser window repositioning/virtual desktop migration phase
- `[x]` Verify the changes by checking backend execution and workspace restorationg commands
- `[x]` Create walkthrough summary and verify restoration
