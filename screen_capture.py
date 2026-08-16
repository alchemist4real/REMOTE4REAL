"""
REMOTE4REAL — Screen Capture Engine
"""

import io
import time
import ctypes
from ctypes import wintypes
import logging
from PIL import Image, ImageDraw

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

# Enable native DPI awareness for true 1080p/4K resolution
try:
    user32.SetProcessDPIAware()
except Exception:
    pass

class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ('biSize', wintypes.DWORD),
        ('biWidth', wintypes.LONG),
        ('biHeight', wintypes.LONG),
        ('biPlanes', wintypes.WORD),
        ('biBitCount', wintypes.WORD),
        ('biCompression', wintypes.DWORD),
        ('biSizeImage', wintypes.DWORD),
        ('biXPelsPerMeter', wintypes.LONG),
        ('biYPelsPerMeter', wintypes.LONG),
        ('biClrUsed', wintypes.DWORD),
        ('biClrImportant', wintypes.DWORD)
    ]

class POINT(ctypes.Structure):
    _fields_ = [("x", wintypes.LONG), ("y", wintypes.LONG)]

class CURSORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("hCursor", wintypes.HANDLE),
        ("ptScreenPos", POINT)
    ]

CURSOR_SHOWING = 0x00000001


class ScreenCapturer:
    def __init__(self, target_width: int = 1280, quality: int = 65):
        self.screen_width = user32.GetSystemMetrics(0)
        self.screen_height = user32.GetSystemMetrics(1)
        self.target_width = min(target_width, self.screen_width)
        self.aspect_ratio = self.screen_height / self.screen_width
        self.target_height = int(self.target_width * self.aspect_ratio)
        self.quality = quality
        
        # Win32 GDI Setup
        self.hdesktop = user32.GetDesktopWindow()
        self.hdesktopdc = user32.GetWindowDC(self.hdesktop)
        self.hmemdc = gdi32.CreateCompatibleDC(self.hdesktopdc)
        self.hbitmap = gdi32.CreateCompatibleBitmap(self.hdesktopdc, self.screen_width, self.screen_height)
        gdi32.SelectObject(self.hmemdc, self.hbitmap)

        self.bmi = BITMAPINFOHEADER()
        self.bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        self.bmi.biWidth = self.screen_width
        self.bmi.biHeight = -self.screen_height  # Top-down DIB
        self.bmi.biPlanes = 1
        self.bmi.biBitCount = 24
        self.bmi.biCompression = 0

        self.buf_size = self.screen_width * self.screen_height * 3
        self.buf = (ctypes.c_char * self.buf_size)()

    def capture_frame_jpeg(self) -> bytes:
        """Capture screen, draw cursor, resize, and return JPEG bytes."""
        try:
            # 1. BitBlt screen to memory DC (0.05ms)
            gdi32.BitBlt(
                self.hmemdc, 0, 0,
                self.screen_width, self.screen_height,
                self.hdesktopdc, 0, 0,
                0x00CC0020 | 0x40000000  # SRCCOPY | CAPTUREBLT
            )

            # 2. Extract DIB bits
            gdi32.GetDIBits(
                self.hmemdc, self.hbitmap, 0,
                self.screen_height,
                ctypes.byref(self.buf),
                ctypes.byref(self.bmi),
                0
            )

            # 3. Create PIL Image
            img = Image.frombuffer(
                'RGB',
                (self.screen_width, self.screen_height),
                self.buf, 'raw', 'BGR', 0, 1
            )

            # 4. Draw mouse cursor
            ci = CURSORINFO()
            ci.cbSize = ctypes.sizeof(CURSORINFO)
            if user32.GetCursorInfo(ctypes.byref(ci)) and (ci.flags & CURSOR_SHOWING):
                cx = ci.ptScreenPos.x
                cy = ci.ptScreenPos.y
                if 0 <= cx < self.screen_width and 0 <= cy < self.screen_height:
                    draw = ImageDraw.Draw(img)
                    draw.polygon(
                        [(cx, cy), (cx + 14, cy + 14), (cx + 5, cy + 16), (cx, cy + 22)],
                        fill=(0, 0, 0), outline=(255, 255, 255)
                    )

            # 5. Resize for fast streaming performance
            if self.target_width < self.screen_width:
                img = img.resize((self.target_width, self.target_height), Image.BILINEAR)

            # 6. Encode to JPEG
            out_buf = io.BytesIO()
            img.save(out_buf, format='JPEG', quality=self.quality, optimize=False)
            return out_buf.getvalue()

        except Exception as e:
            logging.error(f"Screen capture error: {e}")
            return b""

    def get_resolution(self) -> dict:
        return {
            "width": self.screen_width,
            "height": self.screen_height,
            "scaled_width": self.target_width,
            "scaled_height": self.target_height
        }

    def cleanup(self):
        try:
            gdi32.DeleteObject(self.hbitmap)
            gdi32.DeleteDC(self.hmemdc)
            user32.ReleaseDC(self.hdesktop, self.hdesktopdc)
        except Exception:
            pass
