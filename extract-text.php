<?php
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'File is required.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = $_FILES['file'];
$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!class_exists('ZipArchive')) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'ZipArchive is not available.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function normalize_openxml_text(string $xml): string
{
    $xml = str_replace('</w:p>', "\n", $xml);
    $xml = str_replace('</w:tr>', "\n", $xml);
    $xml = preg_replace('/<w:tab[^>]*\/>/', "\t", $xml);
    $xml = preg_replace('/<w:br[^>]*\/>/', "\n", $xml);
    $xml = preg_replace('/<w:cr[^>]*\/>/', "\n", $xml);
    $xml = preg_replace('/<w:t\b[^>]*>(.*?)<\/w:t>/s', '$1', $xml);
    $xml = preg_replace('/<[^>]+>/', '', $xml);

    $text = html_entity_decode($xml, ENT_QUOTES | ENT_XML1, 'UTF-8');
    $text = preg_replace("/\n{3,}/", "\n\n", $text);

    return trim($text);
}

function normalize_slide_text(string $xml): string
{
    $xml = preg_replace('/<a:br[^>]*\/>/', "\n", $xml);
    $xml = preg_replace('/<a:t\b[^>]*>(.*?)<\/a:t>/s', '$1', $xml);
    $xml = preg_replace('/<[^>]+>/', '', $xml);

    $text = html_entity_decode($xml, ENT_QUOTES | ENT_XML1, 'UTF-8');
    $text = preg_replace("/\n{3,}/", "\n\n", $text);

    return trim($text);
}

function normalize_odt_text(string $xml): string
{
    $xml = str_replace('</text:p>', "\n", $xml);
    $xml = str_replace('</text:h>', "\n", $xml);
    $xml = preg_replace('/<text:tab[^>]*\/>/', "\t", $xml);
    $xml = preg_replace('/<text:line-break[^>]*\/>/', "\n", $xml);
    $xml = preg_replace('/<[^>]+>/', '', $xml);

    $text = html_entity_decode($xml, ENT_QUOTES | ENT_XML1, 'UTF-8');
    $text = preg_replace("/\n{3,}/", "\n\n", $text);

    return trim($text);
}

function extract_docx_text(ZipArchive $zip): ?string
{
    $documentXml = $zip->getFromName('word/document.xml');
    return $documentXml === false ? null : normalize_openxml_text($documentXml);
}

function extract_pptx_text(ZipArchive $zip): ?string
{
    $texts = [];

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (preg_match('#^ppt/slides/slide\d+\.xml$#', $name)) {
            $content = $zip->getFromIndex($i);
            if ($content !== false) {
                $slideText = normalize_slide_text($content);
                if ($slideText !== '') {
                    $texts[] = $slideText;
                }
            }
        }
    }

    return $texts === [] ? null : implode("\n\n", $texts);
}

function extract_xlsx_text(ZipArchive $zip): ?string
{
    $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
    if ($sharedStringsXml === false) {
        return null;
    }

    preg_match_all('/<t[^>]*>(.*?)<\/t>/s', $sharedStringsXml, $matches);
    if (empty($matches[1])) {
        return null;
    }

    $texts = array_map(
        static fn ($value) => html_entity_decode($value, ENT_QUOTES | ENT_XML1, 'UTF-8'),
        $matches[1]
    );

    return trim(implode("\n", array_filter($texts, static fn ($value) => $value !== '')));
}

function extract_odt_text(ZipArchive $zip): ?string
{
    $contentXml = $zip->getFromName('content.xml');
    return $contentXml === false ? null : normalize_odt_text($contentXml);
}

function extract_rtf_text(string $contents): string
{
    $contents = preg_replace("/\\\\par[d]?/", "\n", $contents);
    $contents = preg_replace("/\\\\tab/", "\t", $contents);
    $contents = preg_replace_callback(
        "/\\\\u(-?\d+)\??/",
        static function ($matches) {
            $codePoint = (int) $matches[1];
            if ($codePoint < 0) {
                $codePoint += 65536;
            }
            return mb_convert_encoding('&#' . $codePoint . ';', 'UTF-8', 'HTML-ENTITIES');
        },
        $contents
    );
    $contents = preg_replace("/\\\\'[0-9a-fA-F]{2}/", '', $contents);
    $contents = preg_replace('/\\\\[a-z]+\d* ?/', '', $contents);
    $contents = preg_replace('/[{}]/', '', $contents);
    $contents = html_entity_decode($contents, ENT_QUOTES | ENT_XML1, 'UTF-8');
    $contents = preg_replace("/\n{3,}/", "\n\n", $contents);

    return trim($contents);
}

$zip = new ZipArchive();
$text = null;

if (in_array($extension, ['docx', 'pptx', 'xlsx', 'odt'], true)) {
    $openResult = $zip->open($file['tmp_name']);

    if ($openResult !== true) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to open file.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($extension === 'docx') {
        $text = extract_docx_text($zip);
    } elseif ($extension === 'pptx') {
        $text = extract_pptx_text($zip);
    } elseif ($extension === 'xlsx') {
        $text = extract_xlsx_text($zip);
    } elseif ($extension === 'odt') {
        $text = extract_odt_text($zip);
    }

    $zip->close();
} elseif ($extension === 'rtf') {
    $contents = file_get_contents($file['tmp_name']);
    if ($contents !== false) {
        $text = extract_rtf_text($contents);
    }
} else {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Unsupported file type.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($text === null) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Document body was not found.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success' => true,
    'text' => $text
], JSON_UNESCAPED_UNICODE);
