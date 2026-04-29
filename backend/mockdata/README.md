# Mock Data

Test data seeder for the PICT CIE Platform.

## Seed mock data

```bash
cd backend
node mockdata/seedMockData.js
```

## Reset (remove all mock data)

```bash
cd backend
node mockdata/seedMockData.js --reset
```

## What gets created

| Entity | Count | Details |
|--------|-------|---------|
| Academic Years | 2 | 2024-25, 2025-26 |
| Classes | 3 | TE COMP A, TE COMP B (2025-26), SE COMP (2024-25) |
| Faculty | 3 | Priya Sharma, Rajesh Deshmukh, Anita Kulkarni |
| Students | 25 | 15 in TE COMP A, 10 in TE COMP B |
| Subjects | 3 | DSAL, OOP (TE COMP A), DBMS (TE COMP B) |
| Templates | 3 | PPT, GD, Viva (with default rubrics) |
| Activities | 5 | 3 for DSAL, 2 for OOP |
| Scores | ~105 | DSAL PPT + GD fully graded |
| Final Results | 15 | DSAL results computed out of /15 |

## Login credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pict.edu | Admin@123 |
| Faculty | priya.sharma@pict.edu | Faculty@123 |
| Faculty | rajesh.deshmukh@pict.edu | Faculty@123 |
| Faculty | anita.kulkarni@pict.edu | Faculty@123 |
