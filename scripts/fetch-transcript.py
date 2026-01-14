#!/usr/bin/env python3
"""
Fetch YouTube transcript using youtube-transcript-api
Usage: python3 fetch-transcript.py <video_id>
Output: JSON with transcript data
"""

import sys
import json

def fetch_transcript(video_id):
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        ytt = YouTubeTranscriptApi()
        transcript = ytt.fetch(video_id)

        # Convert to list of segments
        segments = []
        full_text_parts = []

        for snippet in transcript.snippets:
            segments.append({
                "text": snippet.text,
                "start": snippet.start,
                "duration": snippet.duration
            })
            full_text_parts.append(snippet.text)

        full_text = " ".join(full_text_parts)

        result = {
            "success": True,
            "segments": segments,
            "fullText": full_text,
            "language": transcript.language if hasattr(transcript, 'language') else "en",
            "wordCount": len(full_text.split()),
            "characterCount": len(full_text)
        }

        print(json.dumps(result))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "errorType": type(e).__name__
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage: fetch-transcript.py <video_id>"}))
        sys.exit(1)

    video_id = sys.argv[1]
    fetch_transcript(video_id)
