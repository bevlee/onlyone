import { correctGuess, sameWord, getStem } from "../utils.js";

import { expect } from "chai";

describe("checking whether the guesses are correct", () => {
  it("exact same word", () => {
    let guess = "pie";
    let word = "pie";
    const response = correctGuess(guess, word);
    expect(response).to.equal(true);
  });
  it("3 letter word and one char off", () => {
    let guess = "pia";
    let word = "pie";
    const response = correctGuess(guess, word);
    expect(response).to.equal(false);
  });
  it("4 letter word and one char off", () => {
    let guess = "pies";
    let word = "pier";
    const response = correctGuess(guess, word);
    expect(response).to.equal(true);
  });
  it("7 letter word and one char off", () => {
    let guess = "peacocks";
    let word = "peacock";
    const response = correctGuess(guess, word);
    expect(response).to.equal(true);
  });
  it("7 letter word and two char off", () => {
    let guess = "peecocks";
    let word = "peacock";
    const response = correctGuess(guess, word);
    expect(response).to.equal(false);
  });
  it("8 letter word and two char off", () => {
    let guess = "elephoany";
    let word = "elephant";
    const response = correctGuess(guess, word);
    expect(response).to.equal(true);
  });

  it("first word matches", () => {
    let guess = "Bob";
    let word = "Bob Jones";
    const response = correctGuess(guess, word);
    expect(response).to.equal(true);
  });
  it("last word matches", () => {
    let guess = "joNes";
    let word = "Bob Jones";
    const response = correctGuess(guess, word);
    expect(response).to.equal(true);
  });
  it("case doesnt match", () => {
    let guess = "telephone";
    let word = "TelePhoNE";
    const response = correctGuess(guess, word);
    expect(response).to.equal(true);
  });
});
