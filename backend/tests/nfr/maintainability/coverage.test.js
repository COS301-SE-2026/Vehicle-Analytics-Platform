


const fs = require('fs');

const path = require('path');



describe('NFR5.1 - Code Coverage', () => {

  test('Coverage should be >= 80%', () => {

    const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

    
    
    if (!fs.existsSync(coverageFile)) {
    
      console.log('  Coverage file not found. Run npm run test:coverage first.');
    
      console.log('  Test will be skipped.');
    
      return;
    
    }
    

    
    
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    
    
    const total = coverage.total;
    
    const lines = total.lines.pct;
    
    const statements = total.statements.pct;
    
    const functions = total.functions.pct;
    
    const branches = total.branches.pct;
    

    
    console.log('  Coverage Summary:');
    
    console.log('  ---------------------');
    
    console.log('  Lines:      ' + lines + '%');
    
    console.log('  Statements: ' + statements + '%');
    
    console.log('  Functions:  ' + functions + '%');
    
    console.log('  Branches:   ' + branches + '%');
    
    console.log('  ---------------------');
    
    console.log('  Target:     >= 80%');
    
    console.log('  Status:     ' + (lines >= 80 ? 'PASS' : 'FAIL'));
    
    
    
    expect(lines).toBeGreaterThanOrEqual(80);
  
  
  
  });
});
