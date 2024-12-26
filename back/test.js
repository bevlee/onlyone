const a = async () => {
  setTimeout(() => {
    console.log("done");
  }, 5000);
};

const run = async () => {
  a();

  setTimeout(() => {
    console.log("lifes good");
  }, 2000);
  return;
};
run();
