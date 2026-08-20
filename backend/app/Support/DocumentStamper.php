<?php

namespace App\Support;

use setasign\Fpdi\Fpdi as FpdiPdf;

class DocumentStamper
{
    protected const WIDTH_RATIO = 0.28;
    protected const MARGIN_RATIO = 0.03;

    public static function stamp(string $absolutePath, string $mimeType): void
    {
        match ($mimeType) {
            'application/pdf' => self::stampPdf($absolutePath),
            'image/jpeg', 'image/jpg', 'image/png' => self::stampImage($absolutePath, $mimeType),
            default => null,
        };
    }

    protected static function cachetPath(): string
    {
        return resource_path('images/cachet.png');
    }

    protected static function stampPdf(string $path): void
    {
        $cachet = self::cachetPath();
        [$cachetPxW, $cachetPxH] = getimagesize($cachet);
        $ratio = $cachetPxH / $cachetPxW;

        $pdf = new FpdiPdf();
        $pageCount = $pdf->setSourceFile($path);

        for ($i = 1; $i <= $pageCount; $i++) {
            $tplId = $pdf->importPage($i);
            $size = $pdf->getTemplateSize($tplId);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($tplId);

            if ($i === $pageCount) {
                $stampWidth = $size['width'] * self::WIDTH_RATIO;
                $stampHeight = $stampWidth * $ratio;
                $margin = $size['width'] * self::MARGIN_RATIO;
                $x = $size['width'] - $stampWidth - $margin;
                $y = $size['height'] - $stampHeight - $margin;
                $pdf->Image($cachet, $x, $y, $stampWidth, $stampHeight, 'PNG');
            }
        }

        $pdf->Output($path, 'F');
    }

    protected static function stampImage(string $path, string $mimeType): void
    {
        $base = $mimeType === 'image/png' ? imagecreatefrompng($path) : imagecreatefromjpeg($path);
        $cachet = imagecreatefrompng(self::cachetPath());

        $baseW = imagesx($base);
        $baseH = imagesy($base);
        $cachetW = imagesx($cachet);
        $cachetH = imagesy($cachet);

        $targetW = (int) round($baseW * self::WIDTH_RATIO);
        $targetH = (int) round($targetW * $cachetH / $cachetW);

        $resized = imagecreatetruecolor($targetW, $targetH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
        imagefill($resized, 0, 0, $transparent);
        imagecopyresampled($resized, $cachet, 0, 0, 0, 0, $targetW, $targetH, $cachetW, $cachetH);

        $margin = (int) round($baseW * self::MARGIN_RATIO);
        $x = $baseW - $targetW - $margin;
        $y = $baseH - $targetH - $margin;

        imagealphablending($base, true);
        imagecopy($base, $resized, $x, $y, 0, 0, $targetW, $targetH);

        $mimeType === 'image/png' ? imagepng($base, $path) : imagejpeg($base, $path, 92);

        imagedestroy($base);
        imagedestroy($cachet);
        imagedestroy($resized);
    }
}
