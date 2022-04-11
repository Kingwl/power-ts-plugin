export function trim(str: string, charset: string) {
    const set = new Set(charset.split(''));
    let start = 0;
    let end = str.length;
    while (start < end && set.has(str[start])) {
        start++;
    }
    while (end > start && set.has(str[end - 1])) {
        end--;
    }
    return str.substring(start, end);
}
