const translations = {
    en: {
        pageTitle: "Text Comparison Tool (Diff)",
        title: "Text Comparison Tool (Diff)",
        subtitle: "A clean diff checker for comparing before and after text.",
        originalTextLabel: "Original Text",
        originalTextPlaceholder: "Enter the original text here, or drop a file...",
        changedTextLabel: "Updated Text",
        changedTextPlaceholder: "Enter the updated text here, or drop a file...",
        compareBtn: "Compare",
        clearBtn: "Clear",
        originalDiffLabel: "Original Text",
        changedDiffLabel: "Changes",
        dropHint: "Drag and drop supported",
        addedCountLabel: "Added",
        removedCountLabel: "Removed",
        charsSuffix: " chars",
        countSuffix: ""
    },
    ja: {
        pageTitle: "テキスト比較ツール（Diff）",
        title: "テキスト比較ツール（Diff）",
        subtitle: "追記と削除をすっきり見比べられる、シンプルな差分チェックツールです。",
        originalTextLabel: "元のテキスト",
        originalTextPlaceholder: "ここに元のテキストを入力する、またはファイルをドロップしてください…",
        changedTextLabel: "変更後テキスト",
        changedTextPlaceholder: "ここに変更後のテキストを入力する、またはファイルをドロップしてください…",
        compareBtn: "比較する",
        clearBtn: "クリア",
        originalDiffLabel: "元のテキスト",
        changedDiffLabel: "変更点",
        addedCountLabel: "追記箇所",
        removedCountLabel: "削除箇所",
        charsSuffix: " 文字",
        countSuffix: "件"
    }
};

function getCurrentLanguage() {
    const userLang = navigator.language || navigator.userLanguage || "en";
    return userLang.startsWith("ja") ? "ja" : "en";
}

function applyTranslations(lang) {
    const copy = translations[lang];

    document.title = copy.pageTitle;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        if (copy[key]) {
            element.textContent = copy[key];
        }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
        const key = element.getAttribute("data-i18n-placeholder");
        if (copy[key]) {
            element.setAttribute("placeholder", copy[key]);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const lang = getCurrentLanguage();
    const copy = translations[lang];
    applyTranslations(lang);

    const originalTextArea = document.getElementById("ot");
    const changedTextArea = document.getElementById("ct");
    const compareBtn = document.getElementById("cb");
    const clearBtn = document.getElementById("clb");
    const diffOutputOriginal = document.getElementById("doo");
    const diffOutputChanged = document.getElementById("doc");
    const resultPanels = document.getElementById("rps");
    const bottomActions = document.getElementById("ba");
    const diffSummary = document.getElementById("diff-summary");
    const addCount = document.getElementById("add-count");
    const removeCount = document.getElementById("remove-count");
    const originalCount = document.getElementById("doo-count");
    const changedCount = document.getElementById("doc-count");
    const extractableExtensions = new Set(["docx", "pptx", "xlsx", "odt", "rtf"]);
    const blockedBinaryExtensions = new Set([
        "doc", "xls", "ppt", "pdf", "zip", "7z", "rar",
        "jpg", "jpeg", "png", "gif", "webp", "svg",
        "mp3", "wav", "mp4", "mov", "avi",
        "exe", "dll", "bin"
    ]);
    const textExtensions = new Set([
        "txt", "csv", "tsv", "md", "markdown", "json", "xml", "html", "htm",
        "css", "scss", "sass", "js", "ts", "jsx", "tsx", "php", "py", "rb",
        "java", "c", "cpp", "h", "hpp", "cs", "go", "rs", "swift", "kt",
        "yaml", "yml", "ini", "cfg", "conf", "log", "sql"
    ]);

    const escapeHTML = (str) => str.replace(/[&<>'"]/g, (tag) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    }[tag] || tag));

    const setCountText = (element, value) => {
        element.textContent = `${value}${copy.countSuffix}`;
    };

    const toggleCompareBtn = () => {
        compareBtn.disabled = !originalTextArea.value.trim() && !changedTextArea.value.trim();
    };

    const getFileExtension = (file) => {
        const name = file?.name?.toLowerCase() || "";
        const match = name.match(/\.([a-z0-9]+)$/);
        return match ? match[1] : "";
    };

    const isExtractableOfficeFile = (file) => extractableExtensions.has(getFileExtension(file));

    const isBlockedBinaryFile = (file) => {
        const type = file?.type || "";
        const extension = getFileExtension(file);

        return (
            blockedBinaryExtensions.has(extension) ||
            type.startsWith("image/") ||
            type.startsWith("audio/") ||
            type.startsWith("video/") ||
            type === "application/pdf" ||
            type === "application/zip" ||
            type === "application/x-7z-compressed" ||
            type === "application/vnd.ms-word" ||
            type === "application/msword" ||
            type === "application/vnd.ms-excel" ||
            type === "application/vnd.ms-powerpoint"
        );
    };

    const decodeTextBuffer = (buffer, encoding) => {
        const decoder = new TextDecoder(encoding, { fatal: false });
        return decoder.decode(buffer);
    };

    const getReplacementScore = (text) => {
        if (!text) return 0;
        const replacements = (text.match(/\uFFFD/g) || []).length;
        return replacements / text.length;
    };

    const looksBinaryFromBuffer = (buffer) => {
        const bytes = new Uint8Array(buffer);
        if (bytes.length === 0) return false;

        let suspiciousCount = 0;
        const sampleSize = Math.min(bytes.length, 512);

        for (let i = 0; i < sampleSize; i += 1) {
            const value = bytes[i];
            const isControl =
                value === 0 ||
                value < 9 ||
                (value > 13 && value < 32);

            if (isControl) suspiciousCount += 1;
        }

        return suspiciousCount / sampleSize > 0.1;
    };

    const decodeTextFile = (buffer) => {
        const candidates = ["utf-8", "shift_jis", "euc-jp", "iso-2022-jp"];
        let bestText = "";
        let bestScore = Number.POSITIVE_INFINITY;

        candidates.forEach((encoding) => {
            try {
                const decoded = decodeTextBuffer(buffer, encoding);
                const score = getReplacementScore(decoded);

                if (score < bestScore) {
                    bestScore = score;
                    bestText = decoded;
                }
            } catch (error) {
                // Ignore unsupported decoder.
            }
        });

        return bestText;
    };

    const readPlainTextFile = async (file) => {
        const buffer = await file.arrayBuffer();

        if (looksBinaryFromBuffer(buffer)) {
            throw new Error("Binary file detected");
        }

        return decodeTextFile(buffer);
    };

    const extractOfficeText = async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("extract-text.php", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Extraction request failed");
        }

        const data = await response.json();

        if (!data.success || typeof data.text !== "string") {
            throw new Error("Extraction failed");
        }

        return data.text;
    };

    const loadFileIntoTextArea = async (file, textArea) => {
        if (!file) return;

        if (isExtractableOfficeFile(file)) {
            try {
                textArea.value = await extractOfficeText(file);
                toggleCompareBtn();
            } catch (error) {
                window.alert("Office ファイルの本文抽出に失敗しました。別のファイルでお試しください。");
            }
            return;
        }

        if (isBlockedBinaryFile(file)) {
            window.alert("この形式は比較対象外です。テキスト、docx、xlsx、pptx、odt、rtf をご利用ください。");
            return;
        }

        try {
            const extension = getFileExtension(file);
            const text = await readPlainTextFile(file);

            if (!text && extension && !textExtensions.has(extension)) {
                window.alert("このファイルは本文を取り出せませんでした。テキスト系ファイルか Office ファイルをご利用ください。");
                return;
            }

            textArea.value = text;
            toggleCompareBtn();
        } catch (error) {
            window.alert("文字化けしやすい形式のため読み込めませんでした。テキスト、docx、xlsx、pptx、odt、rtf をご利用ください。");
        }
    };

    const attachDropZone = (textArea) => {
        const activate = () => textArea.classList.add("is-dragover");
        const deactivate = () => textArea.classList.remove("is-dragover");

        ["dragenter", "dragover"].forEach((eventName) => {
            textArea.addEventListener(eventName, (event) => {
                event.preventDefault();
                activate();
            });
        });

        ["dragleave", "dragend", "drop"].forEach((eventName) => {
            textArea.addEventListener(eventName, (event) => {
                event.preventDefault();
                deactivate();
            });
        });

        textArea.addEventListener("drop", (event) => {
            const [file] = event.dataTransfer.files;
            void loadFileIntoTextArea(file, textArea);
        });
    };

    const renderDiff = () => {
        const originalText = originalTextArea.value;
        const changedText = changedTextArea.value;
        const diff = Diff.diffLines(originalText, changedText);

        let leftHTML = "";
        let rightHTML = "";
        let leftLineNum = 1;
        let rightLineNum = 1;
        let addedCountValue = 0;
        let removedCountValue = 0;

        for (let i = 0; i < diff.length; i++) {
            const part = diff[i];

            if (part.removed && diff[i + 1] && diff[i + 1].added) {
                const removedLines = part.value.split("\n");
                const addedLines = diff[i + 1].value.split("\n");

                if (removedLines[removedLines.length - 1] === "") removedLines.pop();
                if (addedLines[addedLines.length - 1] === "") addedLines.pop();

                const maxLines = Math.max(removedLines.length, addedLines.length);

                for (let j = 0; j < maxLines; j++) {
                    const removedLine = removedLines[j];
                    const addedLine = addedLines[j];

                    if (removedLine !== undefined && addedLine !== undefined) {
                        addedCountValue++;
                        removedCountValue++;

                        const charDiff = Diff.diffChars(removedLine, addedLine);
                        let mergedHTML = "";

                        charDiff.forEach((chunk) => {
                            const content = escapeHTML(chunk.value);

                            if (chunk.added) {
                                mergedHTML += `<span class="diff-added-inline">${content}</span>`;
                            } else if (chunk.removed) {
                                mergedHTML += `<span class="diff-removed-inline">${content}</span>`;
                            } else {
                                mergedHTML += content;
                            }
                        });

                        leftHTML += `<div class="dl"><span class="ln">${leftLineNum++}</span><span class="lc">${escapeHTML(removedLine)}</span></div>`;
                        rightHTML += `<div class="dl"><span class="ln">${rightLineNum++}</span><span class="lc">${mergedHTML}</span></div>`;
                    } else if (removedLine !== undefined) {
                        removedCountValue++;
                        leftHTML += `<div class="dl"><span class="ln">${leftLineNum++}</span><span class="lc">${escapeHTML(removedLine)}</span></div>`;
                        rightHTML += `<div class="dl"><span class="ln">${rightLineNum++}</span><span class="lc diff-removed-full-line">${escapeHTML(removedLine)}</span></div>`;
                    } else if (addedLine !== undefined) {
                        addedCountValue++;
                        leftHTML += `<div class="dl spacer"><span class="ln">&nbsp;</span><span class="lc">&nbsp;</span></div>`;
                        rightHTML += `<div class="dl"><span class="ln">${rightLineNum++}</span><span class="lc"><span class="diff-added-inline">${escapeHTML(addedLine)}</span></span></div>`;
                    }
                }

                i++;
            } else if (part.added) {
                const lines = part.value.split("\n");
                if (lines[lines.length - 1] === "") lines.pop();

                lines.forEach((line) => {
                    addedCountValue++;
                    leftHTML += `<div class="dl spacer"><span class="ln">&nbsp;</span><span class="lc">&nbsp;</span></div>`;
                    rightHTML += `<div class="dl"><span class="ln">${rightLineNum++}</span><span class="lc"><span class="diff-added-inline">${escapeHTML(line)}</span></span></div>`;
                });
            } else if (part.removed) {
                const lines = part.value.split("\n");
                if (lines[lines.length - 1] === "") lines.pop();

                lines.forEach((line) => {
                    removedCountValue++;
                    leftHTML += `<div class="dl"><span class="ln">${leftLineNum++}</span><span class="lc">${escapeHTML(line)}</span></div>`;
                    rightHTML += `<div class="dl"><span class="ln">${rightLineNum++}</span><span class="lc diff-removed-full-line">${escapeHTML(line)}</span></div>`;
                });
            } else {
                const lines = part.value.split("\n");
                if (lines[lines.length - 1] === "") lines.pop();

                lines.forEach((line) => {
                    leftHTML += `<div class="dl"><span class="ln">${leftLineNum++}</span><span class="lc">${escapeHTML(line)}</span></div>`;
                    rightHTML += `<div class="dl"><span class="ln">${rightLineNum++}</span><span class="lc">${escapeHTML(line)}</span></div>`;
                });
            }
        }

        diffOutputOriginal.innerHTML = leftHTML;
        diffOutputChanged.innerHTML = rightHTML;
        setCountText(addCount, addedCountValue);
        setCountText(removeCount, removedCountValue);
        originalCount.textContent = `${originalText.length}${copy.charsSuffix}`;
        changedCount.textContent = `${changedText.length}${copy.charsSuffix}`;

        diffSummary.style.display = "flex";
        resultPanels.style.display = "grid";
        bottomActions.style.display = "flex";
        resultPanels.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    originalTextArea.addEventListener("input", toggleCompareBtn);
    changedTextArea.addEventListener("input", toggleCompareBtn);
    attachDropZone(originalTextArea);
    attachDropZone(changedTextArea);
    toggleCompareBtn();

    compareBtn.addEventListener("click", renderDiff);

    clearBtn.addEventListener("click", () => {
        originalTextArea.value = "";
        changedTextArea.value = "";
        diffSummary.style.display = "none";
        resultPanels.style.display = "none";
        bottomActions.style.display = "none";
        diffOutputOriginal.innerHTML = "";
        diffOutputChanged.innerHTML = "";
        setCountText(addCount, 0);
        setCountText(removeCount, 0);
        originalCount.textContent = "";
        changedCount.textContent = "";
        originalTextArea.classList.remove("is-dragover");
        changedTextArea.classList.remove("is-dragover");
        toggleCompareBtn();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});
