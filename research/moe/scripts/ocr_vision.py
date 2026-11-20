"""OCR rendered page images with macOS Vision (zh-Hans + en), dump text boxes as JSON.

Usage: python -I ocr_vision.py <out.json> <img1.png> [img2.png ...]
Each box: page image name, text, confidence, normalized bbox (x, y, w, h) with origin top-left.
"""
import json
import sys

import Quartz
import Vision
from Foundation import NSURL


def ocr(path):
    url = NSURL.fileURLWithPath_(path)
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    img = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    req.setRecognitionLanguages_(["zh-Hans", "en-US"])
    req.setUsesLanguageCorrection_(False)
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(img, None)
    ok, err = handler.performRequests_error_([req], None)
    if not ok:
        raise RuntimeError(str(err))
    out = []
    for obs in req.results():
        cand = obs.topCandidates_(1)[0]
        bb = obs.boundingBox()
        out.append(dict(text=cand.string(), conf=float(cand.confidence()),
                        x=bb.origin.x, y=1 - bb.origin.y - bb.size.height,
                        w=bb.size.width, h=bb.size.height))
    return out


def main(out_path, *imgs):
    res = {}
    for p in imgs:
        res[p.rsplit("/", 1)[-1]] = ocr(p)
        print(p, len(res[p.rsplit("/", 1)[-1]]), file=sys.stderr)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False)


if __name__ == "__main__":
    main(*sys.argv[1:])
