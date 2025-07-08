// Custom JavaScript will be added here

document.addEventListener('DOMContentLoaded', () => {
    // Demo Simulation Elements
    const registrationStep = document.getElementById('registration-step');
    const votingStep = document.getElementById('voting-step');
    const resultsStep = document.getElementById('results-step');

    const registrationForm = document.getElementById('registration-form');
    const mockVinInput = document.getElementById('mock-vin');
    const otpSection = document.getElementById('otp-section');
    const otpForm = document.getElementById('otp-form');
    const mockOtpInput = document.getElementById('mock-otp');
    const registrationMessage = document.getElementById('registration-message');

    const voterIdDisplay = document.getElementById('voter-id-display');
    const voteCastingForm = document.getElementById('vote-casting-form');
    const voteCastingMessage = document.getElementById('vote-casting-message');
    const voteSubmitText = document.getElementById('vote-submit-text');
    const voteSpinner = document.getElementById('vote-spinner');
    const encryptionAnimation = document.getElementById('encryption-animation');
    const encryptionProgressBar = document.getElementById('encryption-progress-bar');
    const encryptionDots = document.getElementById('encryption-dots');


    const resultsChartCtx = document.getElementById('resultsChart')?.getContext('2d');
    const totalVotesCastDisplay = document.getElementById('total-votes-cast');
    const resetDemoButton = document.getElementById('reset-demo-button');

    let currentVoterVIN = null;
    let resultsChart = null;
    const MOCK_OTP = "123456"; // Hardcoded OTP for demo

    // Initialize or load votes from localStorage
    let votes = JSON.parse(localStorage.getItem('demoVotes')) || {
        "Candidate A": 0,
        "Candidate B": 0,
        "Candidate C": 0
    };
    let votersWhoVoted = JSON.parse(localStorage.getItem('votersWhoVoted')) || [];


    // --- Step 1: Registration ---
    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const vin = mockVinInput.value.trim();
        if (vin.length !== 10 || !/^\d+$/.test(vin)) {
            displayMessage(registrationMessage, 'Please enter a valid 10-digit Mock VIN.', 'danger');
            return;
        }
        if (votersWhoVoted.includes(vin)) {
            displayMessage(registrationMessage, `Voter ${vin} has already voted. Please use a different VIN or reset the demo.`, 'warning');
            // Optionally, allow proceeding to results directly if already voted.
            // showStep(resultsStep);
            // updateResultsChart();
            return;
        }
        currentVoterVIN = vin;
        otpSection.style.display = 'block';
        displayMessage(registrationMessage, 'OTP requested. Please check your mock phone.', 'info');
        mockOtpInput.focus();
    });

    otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const otp = mockOtpInput.value.trim();
        if (otp === MOCK_OTP) {
            displayMessage(registrationMessage, 'OTP Verified! Proceed to vote.', 'success');
            voterIdDisplay.textContent = currentVoterVIN;
            setTimeout(() => {
                showStep(votingStep);
                registrationMessage.innerHTML = ''; // Clear message
                mockVinInput.value = ''; // Clear VIN input
                mockOtpInput.value = ''; // Clear OTP input
                otpSection.style.display = 'none';
            }, 1000);
        } else {
            displayMessage(registrationMessage, 'Invalid OTP. Please try again.', 'danger');
        }
    });

    // --- Step 2: Vote Casting ---
    voteCastingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedCandidate = voteCastingForm.querySelector('input[name="candidate"]:checked');

        if (!selectedCandidate) {
            displayMessage(voteCastingMessage, 'Please select a candidate.', 'warning');
            return;
        }

        // Disable button and show spinner
        voteSubmitText.style.display = 'none';
        voteSpinner.style.display = 'inline-block';
        voteCastingForm.querySelector('button[type="submit"]').disabled = true;
        voteCastingMessage.innerHTML = ''; // Clear previous messages

        // Simulate encryption animation
        encryptionAnimation.style.display = 'block';
        let progress = 0;
        let dots = 0;
        encryptionProgressBar.style.width = '0%';
        encryptionProgressBar.setAttribute('aria-valuenow', 0);
        const interval = setInterval(() => {
            progress += 10;
            dots = (dots + 1) % 4;
            encryptionProgressBar.style.width = progress + '%';
            encryptionProgressBar.setAttribute('aria-valuenow', progress);
            encryptionDots.textContent = '.'.repeat(dots);
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    // Store vote
                    votes[selectedCandidate.value]++;
                    votersWhoVoted.push(currentVoterVIN);
                    localStorage.setItem('demoVotes', JSON.stringify(votes));
                    localStorage.setItem('votersWhoVoted', JSON.stringify(votersWhoVoted));

                    // Simulate SHA-256 Hashing (for demo visualization)
                    const voteData = {
                        voter: currentVoterVIN,
                        candidate: selectedCandidate.value,
                        timestamp: new Date().toISOString()
                    };
                    const hashedVote = await simpleSHA256(JSON.stringify(voteData)); // We'll define simpleSHA256 later

                    displayMessage(voteCastingMessage, `Vote for ${selectedCandidate.value} cast successfully! (Mock Hash: ${hashedVote.substring(0,10)}...)`, 'success');
                    encryptionAnimation.style.display = 'none'; // Hide animation

                    // Re-enable button and hide spinner
                    voteSubmitText.style.display = 'inline-block';
                    voteSpinner.style.display = 'none';
                    voteCastingForm.querySelector('button[type="submit"]').disabled = false;
                    voteCastingForm.reset(); // Clear selection

                    setTimeout(() => {
                        showStep(resultsStep);
                        updateResultsChart();
                        voteCastingMessage.innerHTML = ''; // Clear message
                    }, 2000);
                }, 500); // Short delay after progress bar full
            }
        }, 200); // Animation speed
    });

    // --- Step 3: Results ---
    function updateResultsChart() {
        if (!resultsChartCtx) return;

        const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
        totalVotesCastDisplay.textContent = totalVotes;

        const chartData = {
            labels: Object.keys(votes),
            datasets: [{
                label: 'Votes',
                data: Object.values(votes),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                ],
                borderWidth: 1
            }]
        };

        if (resultsChart) {
            resultsChart.data = chartData;
            resultsChart.update();
        } else {
            resultsChart = new Chart(resultsChartCtx, {
                type: 'pie', // or 'bar'
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Live Election Results'
                        }
                    }
                }
            });
        }
    }

    // --- Utility Functions ---
    function displayMessage(element, message, type = 'info') {
        element.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    }

    function showStep(stepToShow) {
        [registrationStep, votingStep, resultsStep].forEach(step => {
            step.style.display = (step === stepToShow) ? 'block' : 'none';
        });
        // Scroll to the demo area if it's not fully visible
        const demoArea = document.getElementById('demo-area');
        if (demoArea) {
             // demoArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Simple SHA-256 function (browser environment)
    async function simpleSHA256(str) {
        const buffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }


    // --- Reset Demo ---
    resetDemoButton.addEventListener('click', () => {
        localStorage.removeItem('demoVotes');
        localStorage.removeItem('votersWhoVoted');
        votes = { "Candidate A": 0, "Candidate B": 0, "Candidate C": 0 };
        votersWhoVoted = [];
        currentVoterVIN = null;

        if (resultsChart) {
            resultsChart.destroy(); // Destroy existing chart instance
            resultsChart = null; // Reset chart variable
        }
        // Re-initialize the chart with empty data to clear it visually
        updateResultsChart();
        totalVotesCastDisplay.textContent = '0';


        showStep(registrationStep);
        displayMessage(registrationMessage, 'Demo has been reset. You can register and vote again.', 'info');
        setTimeout(() => registrationMessage.innerHTML = '', 3000);

    });

    // Initial setup
    if (votersWhoVoted.length > 0 && !currentVoterVIN) {
        // If there are votes but no active voter session, show results
        showStep(resultsStep);
    } else {
        showStep(registrationStep); // Start with registration
    }
    updateResultsChart(); // Initial chart draw (might be empty)


    // --- Contact Form Handling (Frontend Only for now) ---
    const contactForm = document.getElementById('contact-form');
    const contactFormMessage = document.getElementById('contact-form-message');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const message = document.getElementById('contact-message').value;

            // Basic validation
            if (!name || !email || !message) {
                displayMessage(contactFormMessage, 'Please fill in all required fields.', 'danger');
                return;
            }

            // Simulate form submission
            displayMessage(contactFormMessage, 'Thank you for your message! (This is a demo, no email was actually sent).', 'success');
            contactForm.reset();

            // If a Flask backend were implemented, this is where you'd use fetch():
            /*
            fetch('/submit_contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, subject, message }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayMessage(contactFormMessage, 'Message sent successfully!', 'success');
                    contactForm.reset();
                } else {
                    displayMessage(contactFormMessage, `Error: ${data.message}`, 'danger');
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                displayMessage(contactFormMessage, 'An error occurred while sending the message.', 'danger');
            });
            */
        });
    }
});
