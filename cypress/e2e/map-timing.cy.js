// cypress/e2e/map-timing.cy.js
// NFR1.4: Map page navigation

describe('NFR1.4 - Map Navigation', () => {
  it('should navigate to the live map page', () => {
    // Login
    cy.visit('https://d25bouomowr0it.cloudfront.net/login');
    cy.get('input[type="email"]').type('kmj-manager@kmj.com');
    cy.get('input[type="password"]').type('Capstone@2026');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');

    // Navigate to live map
    cy.visit('https://d25bouomowr0it.cloudfront.net/live-map');
    
    // Check URL contains /live-map
    cy.url().should('include', '/live-map');
    cy.log('Map page loaded successfully');
  });
});
