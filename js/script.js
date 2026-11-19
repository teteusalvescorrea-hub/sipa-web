/* =========================================
   AgIA — SCRIPT PRINCIPAL
   PÁGINA INICIAL
   ========================================= */

"use strict";


/* =========================================
   ELEMENTOS DA PÁGINA
   ========================================= */

const studentLoginButton =
    document.getElementById("student-login-btn");

const registerButton =
    document.getElementById("register-btn");

const whatsappButton =
    document.getElementById("whatsapp-button");


/* =========================================
   BOTÃO — JÁ SOU ALUNO
   ========================================= */

if (studentLoginButton) {

    studentLoginButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            console.log(
                "Acesso de aluno selecionado."
            );

        }
    );

}


/* =========================================
   BOTÃO — QUERO ME CADASTRAR
   ========================================= */

if (registerButton) {

    registerButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            console.log(
                "Cadastro de aluno selecionado."
            );

        }
    );

}


/* =========================================
   BOTÃO — WHATSAPP
   ========================================= */

if (whatsappButton) {

    whatsappButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            console.log(
                "Contato via WhatsApp selecionado."
            );

        }
    );

}
/* =========================================
   ANIMAÇÃO DOS BOTÕES
   ========================================= */

const actionButtons =
    document.querySelectorAll(".action-button");


actionButtons.forEach((button) => {

    button.addEventListener("mousedown", () => {

        button.style.transform =
            "translateY(0) scale(0.98)";

    });


    button.addEventListener("mouseup", () => {

        button.style.transform =
            "";

    });


    button.addEventListener("mouseleave", () => {

        button.style.transform =
            "";

    });

});


/* =========================================
   ANIMAÇÃO DO WHATSAPP
   ========================================= */

if (whatsappButton) {

    whatsappButton.addEventListener(
        "mouseenter",
        () => {

            whatsappButton.style.transform =
                "translateY(-2px)";

        }
    );


    whatsappButton.addEventListener(
        "mouseleave",
        () => {

            whatsappButton.style.transform =
                "";

        }
    );

}


/* =========================================
   CARREGAMENTO DA PÁGINA
   ========================================= */

window.addEventListener(
    "load",
    () => {

        document.body.classList.add(
            "page-loaded"
        );

    }
);