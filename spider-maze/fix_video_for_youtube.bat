@echo off
setlocal enabledelayedexpansion
title YouTube Shorts Progressive MP4 Remuxer & Fixer
echo =========================================================
echo       Spider-Man Arcade - YouTube MP4 Remuxer
echo =========================================================
echo.
if "%~1"=="" (
    echo [ERROR] Drag and drop your .mp4 recording onto this batch file,
    echo         or run: fix_video_for_youtube.bat "your_video.mp4"
    echo.
    pause
    exit /b
)
set "INPUT=%~1"
set "OUTPUT=%~dpn1_youtube_ready.mp4"
echo Input:  "%INPUT%"
echo Output: "!OUTPUT!"
echo.
echo Converting fragmented MP4 to 100%% compliant Progressive MP4...

where node >nul 2>&1
if %errorlevel% equ 0 (
    node "%~dp0tools\remux_file.js" "%INPUT%" "!OUTPUT!"
    if !errorlevel! equ 0 (
        echo.
        echo =========================================================
        echo [SUCCESS] YouTube Shorts Progressive MP4 Ready!
        echo Location: "!OUTPUT!"
        echo.
        echo Windows Properties now displays full duration, bitrate, and
        echo YouTube Shorts preview and upload will accept it seamlessly!
        echo =========================================================
        echo.
        pause
        exit /b 0
    )
)

where ffmpeg >nul 2>&1
if %errorlevel% equ 0 (
    echo Using FFmpeg fallback remux...
    ffmpeg -y -i "%INPUT%" -c copy "!OUTPUT!"
    if !errorlevel! equ 0 (
        echo.
        echo =========================================================
        echo [SUCCESS] YouTube-ready video generated!
        echo Location: "!OUTPUT!"
        echo =========================================================
        echo.
        pause
        exit /b 0
    )
)

echo.
echo [ERROR] Could not process the video. Please ensure Node.js is installed.
echo.
pause
