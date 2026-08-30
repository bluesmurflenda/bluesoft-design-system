// 공용 리포트 출력기 — scripts/README.md '실행 결과 형식' 그대로.
// 검사(id, label)마다 status(PASS|FAIL|WARN|INFO|SKIP)·count·note를 받아 표로 찍고,
// FAIL이 하나라도 있으면 true를 반환한다(호출부가 그걸로 exit code를 정한다).

const STATUS_ORDER = { FAIL: 0, WARN: 1, INFO: 2, SKIP: 3, PASS: 4 };

export function printReport(title, rows) {
  console.log(`\n=== ${title} ===`);
  const idW = Math.max(2, ...rows.map((r) => r.id.length));
  const labelW = Math.max(5, ...rows.map((r) => r.label.length));
  const statusW = 4;
  for (const r of rows) {
    const count = r.count === undefined || r.count === null ? '' : String(r.count);
    const line = [
      r.id.padEnd(idW),
      r.label.padEnd(labelW),
      r.status.padEnd(statusW),
      count.padEnd(5),
      r.note || '',
    ].join('  ');
    console.log(line);
  }
  const hasFail = rows.some((r) => r.status === 'FAIL');
  const summary = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  console.log(
    '---',
    Object.entries(summary)
      .sort((a, b) => (STATUS_ORDER[a[0]] ?? 9) - (STATUS_ORDER[b[0]] ?? 9))
      .map(([s, n]) => `${s}:${n}`)
      .join(' ')
  );
  return hasFail;
}

export function row(id, label, status, count, note) {
  return { id, label, status, count, note };
}
