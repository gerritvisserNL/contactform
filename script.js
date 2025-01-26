document
  .getElementById("contactForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    // Toon de loader
    document.getElementById("loader").style.display = "block";

    // Verkrijg formuliergegevens
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;

    // Basis validatie
    if (!name || !email || !message) {
      document.getElementById("responseMessage").innerText =
        "Alle velden zijn verplicht.";
      document.getElementById("responseMessage").className = "error-message";
      document.getElementById("loader").style.display = "none"; // Verberg de loader
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      document.getElementById("responseMessage").innerText =
        "Ongeldig e-mailadres.";
      document.getElementById("responseMessage").className = "error-message";
      document.getElementById("loader").style.display = "none"; // Verberg de loader
      return;
    }

    // Bereid de payload voor
    const payload = {
      name,
      email,
      message,
    };

    // Verstuur gegevens naar de API
    try {
      const response = await fetch(
        "https://contactform-htfd.onrender.com/api/contact",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (response.ok) {
        document.getElementById("responseMessage").innerText =
          "Bericht succesvol verzonden!";
        document.getElementById("responseMessage").className =
          "success-message";
        document.getElementById("contactForm").reset();
      } else {
        document.getElementById(
          "responseMessage"
        ).innerText = `Fout: ${result.message}`;
        document.getElementById("responseMessage").className = "error-message";
      }
    } catch (error) {
      document.getElementById("responseMessage").innerText =
        "Er is iets misgegaan. Probeer het later opnieuw.";
      document.getElementById("responseMessage").className = "error-message";
      console.error(error);
    } finally {
      // Verberg de loader na de actie
      document.getElementById("loader").style.display = "none";
    }
  });
