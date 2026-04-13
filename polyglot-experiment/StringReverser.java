// Java Experiment - String Reverser
// Java is great for backend and Android development!

public class StringReverser {
    public static void main(String[] args) {
        String original = " Hello World ";
        String reversed = "";

        for (int i = original.length() - 1; i >= 0; i--) {
            reversed += original.charAt(i);
        }

        System.out.println("Language -> Java");
        System.out.println("Task -> String Reverser");
        System.out.println("Original: " + original);
        System.out.println("Reversed: " + reversed);
    }
}